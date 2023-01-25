defmodule VotingSystem.Voter do
  use GenServer
  use TypedStruct

  import VotingSystem.Policy

  require Logger
  require Helpers.Crypto

  @moduledoc """
  A Voting System Voter is a process spawned for a given user to handle voting for them.
  """

  @voterRegistry :voter_registry

  typedstruct enforce: true do
    # The ID of the current voter.
    field :id, atom()

    # The list of active voters on the network.
    field :active_voters, list(atom())

    # If set, the parameters to simulate a voter with.
    field :simulation_parameters, %{
      coordinates: {integer(), integer()},
      tolerance: integer(),
    } | nil, default: nil

    # Stores the PID of the delegate that represents this Voter within the actual
    # voting system. This system uses a Paxos-inspired approach, but could actually
    # be a system independent of Paxos.
    # Paxos is now used to store the voting history of the voting system.
    field :representative, pid() | nil, default: nil

    # Stores the cookie that is needed when altering the Voter's Paxos delegate configuration.
    # This is used for all Paxos instances spawned by this Voter.
    field :paxos_cookie, any(), default: nil

    # The current instance number for this process.
    field :instance_number, any(), default: 0

    # Stores the voting history using a Paxos instance.
    field :history_paxos, pid() | nil, default: nil

    # The voter history, agreed upon with Paxos.
    field :history, list(any()) | nil, default: nil
  end

  ## GenServer API

  def start_link(voter_id, simulation_parameters \\ nil, active_voters \\ []) do
    active_voters = if Enum.member?(active_voters, voter_id), do: active_voters, else: [voter_id | active_voters]

    GenServer.start_link(__MODULE__, %VotingSystem.Voter{
      # The unique ID that refers to the Voter.
      id: voter_id,
      # The list of active voters in the system, initialized to just a list
      # containing the current voter.
      active_voters: active_voters,
      simulation_parameters: simulation_parameters
    }, name: via_tuple(voter_id))
  end

  def child_spec({voter_id, simulation_parameters, active_voters}) do
    %{
      id: nil,
      start: {__MODULE__, :start_link, [
        voter_id, simulation_parameters, active_voters
      ]},
      # Indicate that this is a worker process.
      type: :worker,
      # Ensure the process restarts on abnormal exit.
      restart: :transient,
    }
  end

  @doc """
  The server will restart if any reason other than :normal is given.
  """
  def stop(voter_id, reason) do
    voter_triple = voter_id |> via_tuple()
    voter_triple |> GenServer.call({:stop})
    voter_triple |> GenServer.stop(reason)
  end

  ## Client Requests

  @doc """
  Propose a policy via voter_id.
  """
  def propose(voter_id, policy) do
    voter_id |> via_tuple |> GenServer.call({:propose, policy}, 10_000)
  end

  @doc """
  Check if the specified voter is a simulated voter.
  """
  def is_simulated(voter_id) do
    voter_id |> via_tuple |> GenServer.call(:is_simulated)
  end

  @doc """
  Returns an overview of this voter process in a map.
  """
  def get_overview(voter_id) do
    voter_id |> via_tuple |> GenServer.call(:get_overview)
  end

  def update_voters(voter_id, voters) do
    voter_id |> via_tuple |> GenServer.call({:update_voters, voters})
  end

  ## Server Callbacks

  @impl true
  def init(state) do
    # Create a secure Paxos cookie, start Paxos and augment the state with the Paxos cookie
    # (assuming that Paxos start successfully).
    paxos_cookie = Helpers.Crypto.base64_secure_token()
    representative = Paxos.start(
      state.id, state.active_voters,
      fn ballot, instance_number -> should_accept(state, ballot, instance_number) end,
      paxos_cookie
    )

    if is_pid(representative) do
      Logger.info("Initialized Voter process: #{state.id} [#{is_live_voter_string(state)}]")
      {:ok, %{state | representative: representative, paxos_cookie: paxos_cookie}}
    else
      {:error, "Failed to initialize Paxos for Voter process: #{state.id}."}
    end
  end

  @impl true
  def handle_cast({:notify_instance_number, instance_number}, state) do
    # Increment the instance number if we notice a higher one.
    # We needn't exceed the known instance number as we'll do that on propose.
    if instance_number > state.instance_number do
      %{state | instance_number: instance_number}
    else
      state
    end

    {:noreply, state}
  end

  defp attempt_proposal(representative, instance_number, policy, timeout) do
    time_start = Time.utc_now()
    result = Paxos.propose(representative, instance_number, policy, timeout)

    if result == {:abort} do
      remaining_timeout = timeout - Time.diff(Time.utc_now(), time_start, :millisecond)

      if remaining_timeout > 0 do
        attempt_proposal(representative, instance_number, policy, remaining_timeout)
      else
        result
      end
    else
      result
    end
  end

  @impl true
  def handle_call({:propose, policy}, _from, state) do
    # Propose the ballot/policy to the active voters with a timeout of 8,000ms (8 seconds).
    state = %{state | instance_number: state.instance_number + 1}
    result = attempt_proposal(state.representative, state.instance_number, policy, 8_000)
    {:reply, result, state}
  end

  @impl true
  def handle_call(:is_simulated, _from, state), do: {:reply, !is_live_voter(state), state}

  @impl true
  def handle_call(:get_overview, _from, state), do: {:reply, %{
    id: state.id,
    is_simulated: !is_live_voter(state),
    simulation: state.simulation_parameters,
    active_voters: state.active_voters
  }, state}

  @impl true
  def handle_call({:update_voters, voters}, _from, state) do
    # If the new list of voters is different to the current one, update the list of active voters
    # in both this voter process and the Paxos delegate. Because lists were used, we must sort the
    # lists first to check that just the values are equal. We can optimize this though, by
    # subsequently using the sorted list to save time when running the next iteration (as the list
    # should be mostly, if not entirely, sorted).
    sorted_voters = Enum.sort(voters)
    if Enum.sort(state.active_voters) != sorted_voters do
      # Update the current state.
      state = %{state | active_voters: sorted_voters}

      # Propagate the changes to the Paxos delegate and return the response.
      result_from_paxos = Paxos.change_participants(state.representative, state.paxos_cookie, sorted_voters, 5000)
      {:reply, result_from_paxos, state}
    else
      # If there were no changes, just return :no_change and don't bother to propagate the changes.
      {:reply, :no_change, state}
    end
  end

  @impl true
  def handle_call({:stop}, _from, state) do
    # Terminate Paxos and clear the state.
    Process.exit(state.representative, :kill)
    state = %{state | representative: nil, paxos_cookie: nil}

    {:reply, :ok, state}
  end

  ## Private Helper Functions

  # Checks if the current voter is a live voter (as opposed to an automated/simulated voter).
  defp is_live_voter(state), do: state.simulation_parameters == nil
  defp is_live_voter_string(state), do: (if is_live_voter(state), do: "Live (Human)", else: "Simulated")

  # Computes the euclidean ("as the crow flies") distance between two points, a and b, where
  # a and b are two-dimensional tuples (vectors).
  defp euclidean_distance(a, b) do
    max(Float.floor(:math.sqrt(
      (:math.pow(elem(b, 0) - elem(a, 0), 2)) +
      (:math.pow(elem(b, 1) - elem(a, 1), 2))
    )), 0)
  end

  # should_accept for simulated voters. This checks if the distance between the policy's coordinates
  # and the voter's own coordinates falls within its tolerance for varied policies. Returns true if
  # it does, indicating that the policy should be accepted.
  defp should_accept(initial_state, policy, instance_number) when initial_state.simulation_parameters != nil do
    # First, notify ourselves of the higher ballot number.
    (initial_state.id |> via_tuple |> GenServer.cast({:notify_instance_number, instance_number}))

    # Then, decide whether we want to accept this ballot.
    euclidean_distance(
      initial_state.simulation_parameters.coordinates,
      policy(policy, :coordinates)
    ) <= initial_state.simulation_parameters.tolerance
  end

  # Fallback for should_accept to reject policies. Currently this has the effect of preventing
  # humans from voting on policies, but that could be later modified depending on the functionality
  # of the application.
  defp should_accept(state, _, _), do: {state, false}

  # Computes the :via tuple used to refer to a given Voter process in the global voter registry.
  defp via_tuple(voter_id), do: {:via, Registry, {@voterRegistry, voter_id}}

end
