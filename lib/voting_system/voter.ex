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

    # Stores the PID of the Paxos delegate for this voter.
    field :paxos, pid() | nil, default: nil

    # Stores the cookie that is needed when altering the Voter's Paxos delegate configuration.
    field :paxos_cookie, any(), default: nil
  end

  ## GenServer API

  def start_link(voter_id, active_voters, simulation_parameters \\ nil) do
    GenServer.start_link(__MODULE__, %VotingSystem.Voter{
      # The unique ID that refers to the Voter.
      id: voter_id,
      active_voters: active_voters,
      simulation_parameters: simulation_parameters
    }, name: via_tuple(voter_id))
  end

  def child_spec({voter_id, active_voters, simulation_parameters}) do
    %{
      id: nil,
      start: {__MODULE__, :start_link, [
        voter_id, active_voters, simulation_parameters
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
    voter_id |> via_tuple() |> GenServer.stop(reason)
  end

  ## Client Requests

  @doc """
  Propose a policy via voter_id.
  """
  def propose(voter_id, policy) do
    voter_id |> via_tuple |> GenServer.call({:propose, policy})
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
    paxos = Paxos.start(state.id, state.active_voters, fn ballot -> should_accept(state, ballot) end, paxos_cookie)

    if is_pid(paxos) do
      Logger.info("Initialized Voter process: #{state.id} [#{is_live_voter_string(state)}]")
      {:ok, %{state | paxos: paxos, paxos_cookie: paxos_cookie}}
    else
      {:error, "Failed to initialize Paxos for Voter process: #{state.id}."}
    end
  end

  @impl true
  def handle_call({:propose, policy}, _from, state) do

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
      result_from_paxos = Paxos.change_participants(state.paxos, state.paxos_cookie, sorted_voters, 5000)
      {:reply, result_from_paxos, state}
    else
      # If there were no changes, just return :no_change and don't bother to propagate the changes.
      {:reply, :no_change, state}
    end
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
  defp should_accept(initial_state, policy) when initial_state.simulation_parameters != nil do
    euclidean_distance(
      initial_state.simulation_parameters.coordinates,
      policy(policy, :coordinates)
    ) <= initial_state.simulation_parameters.tolerance
  end

  # Fallback for should_accept to reject policies. Currently this has the effect of preventing
  # humans from voting on policies, but that could be later modified depending on the functionality
  # of the application.
  defp should_accept(_, _), do: false

  # Computes the :via tuple used to refer to a given Voter process in the global voter registry.
  defp via_tuple(voter_id), do: {:via, Registry, {@voterRegistry, voter_id}}

end
