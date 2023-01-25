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
    field :history, list(any()) | nil, default: []

    # The instance number for the voting history Paxos process.
    field :history_instance_number, any(), default: 0
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
    self = voter_id |> via_tuple
    # Return the result of the voting proposal.
    result = (self |> GenServer.call({:propose, policy}, 10_000))
    # Then, attempt to add the result to history using Paxos.
    self |> GenServer.call({:propose_history}, 10_000)
    result
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

  def get_history(voter_id) do
    voter_id |> via_tuple |> GenServer.call({:get_history})
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

    history_paxos_id = get_history_paxos_id(state.id)
    history_workers = get_history_workers(state.active_voters)
    history_paxos = Paxos.start(
      history_paxos_id, history_workers,
      fn _, instance_number -> should_accept_history(state, nil, instance_number) end,
      paxos_cookie
    )

    if is_pid(representative) and is_pid(history_paxos) do
      Logger.info("Initialized Voter process: #{state.id} [#{is_live_voter_string(state)}]")
      Logger.info("Initialized history process: #{history_paxos_id}")
      {:ok, %{state | representative: representative, history_paxos: history_paxos, paxos_cookie: paxos_cookie}}
    else
      {:error, "Failed to initialize Voter process or Paxos process for history: #{state.id}."}
    end
  end

  # Propose a value to a Paxos instance with `max_timeout` being an upper bound on
  # the amount of time the whole process is permitted to take.
  defp attempt_proposal(delegate, instance_number, value, max_timeout) do
    time_start = Time.utc_now()
    result = Paxos.propose(delegate, instance_number, value, max_timeout)

    if result == {:abort} do
      remaining_timeout = max_timeout - Time.diff(Time.utc_now(), time_start, :millisecond)

      if remaining_timeout > 0 do
        attempt_proposal(delegate, instance_number, value, remaining_timeout)
      else
        result
      end
    else
      result
    end
  end

  # Similar to attempt_proposal, but this time to read from Paxos to get the
  # voting history decision for a given instance.
  defp wait_for_history_decision(history_paxos, instance_number, max_timeout) do
    time_start = Time.utc_now()
    result = Paxos.get_decision(history_paxos, instance_number, max_timeout)

    if result != nil do
      result
    else
      remaining_timeout = max_timeout - Time.diff(Time.utc_now(), time_start, :millisecond)

      if remaining_timeout > 0 do
        wait_for_history_decision(history_paxos, instance_number, remaining_timeout)
      else
        result
      end
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

  @impl true
  def handle_cast({:notify_history_instance_number, instance_number}, state) do
    # Increment the instance number if we notice a higher one.
    # We needn't exceed the known instance number as we'll do that on propose.
    if instance_number > state.history_instance_number do
      %{state | history_instance_number: instance_number}
    else
      state
    end

    {:noreply, state}
  end

  @impl true
  def handle_cast({:notify_incoming_history, instance_number}, state) do
    # Wait for the decision from Paxos for this instance number (up to 10s).
    result = wait_for_history_decision(state.history_paxos, instance_number, 10_000)

    # If there's a result, i.e., if it is not nil, update the state history
    # otherwise do nothing.
    state = if result != nil, do: %{state | history: result}, else: state
    {:noreply, state}
  end

  @impl true
  def handle_call({:propose, policy}, _from, state) do
    # Propose the ballot/policy to the active voters with a timeout of 8,000ms (8 seconds).
    state = %{state | instance_number: state.instance_number + 1}
    result = attempt_proposal(state.representative, state.instance_number, policy, 8_000)
    # Add the result to history (with timestamp).
    state = %{state | history: [{DateTime.utc_now() |> DateTime.to_iso8601(), result} | state.history]}
    {:reply, result, state}
  end

  @impl true
  def handle_call({:propose_history}, _from, state) do
    # Propose the history entry to the Paxos instance responsible for history.
    state = %{state | history_instance_number: state.history_instance_number + 1}
    result = attempt_proposal(state.history_paxos, state.history_instance_number, state.history, 8_000)
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
      result_from_voter_delegate = Paxos.change_participants(state.representative, state.paxos_cookie, sorted_voters, 5000)
      result_from_history_paxos = Paxos.change_participants(state.history_paxos, state.paxos_cookie, get_history_workers(sorted_voters), 5000)
      {:reply, {result_from_voter_delegate, result_from_history_paxos}, state}
    else
      # If there were no changes, just return :no_change and don't bother to propagate the changes.
      {:reply, :no_change, state}
    end
  end

  @impl true
  def handle_call({:get_history}, _from, state) do
    {:reply, state.history, state}
  end

  @impl true
  def handle_call({:stop}, _from, state) do
    # Terminate Paxos and clear the state.
    Process.exit(state.representative, :kill)
    state = %{state | representative: nil, paxos_cookie: nil, history_paxos: nil}
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

  # should_accept_history for history Paxos instances.
  # This has no logic to control whether the result should be accepted, other than
  # to indicate that it should once this process has updated its own instance number
  # accordingly.
  defp should_accept_history(initial_state, _, instance_number) do
    # Notify ourselves of the new history instance number.
    (initial_state.id |> via_tuple |> GenServer.cast({:notify_history_instance_number, instance_number}))

    # At this point, we can indicate that we should wait for a new history for
    # this instance number.
    (initial_state.id |> via_tuple |> GenServer.cast({:notify_incoming_history, instance_number}))

    # Indicate that we have acknowledged this in the process, and it can be
    # accepted by Paxos.
    true
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

  # Returns the 'history_paxos' process ID from the parent process ID.
  defp get_history_paxos_id(id), do: String.to_atom(Atom.to_string(id) <> "_history")

  # Does get_history_paxos_id for every entry in a list.
  defp get_history_workers(active_voters) do
    Enum.map(active_voters, fn active_voter_id -> get_history_paxos_id(active_voter_id) end)
  end

end
