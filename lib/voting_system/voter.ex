defmodule VotingSystem.Voter do
  use GenServer
  use TypedStruct
  require Logger
  import VotingSystem.Policy

  @moduledoc """
  A Voting System Voter is a process spawned for a given user to handle voting for them.
  """

  @voterRegistry :voter_registry

  typedstruct enforce: true do
    field :id, atom()
    field :active_voters, list(String.t())
    field :simulation_parameters, %{
      coordinates: {integer(), integer()},
      tolerance: integer(),
    } | nil, default: nil
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
  For debugging purposes, print the state of the current Voter.
  """
  def log_state(voter_id) do
    voter_id |> via_tuple |> GenServer.call(:log_state)
  end

  ## Server Callbacks

  @impl true
  def init(state) do
    Logger.info("Initialized Voter process: #{state.id} [#{is_live_voter_string(state)}]")
    Paxos.start(state.id, state.active_voters, fn ballot -> should_accept(state, ballot) end)
    {:ok, state}
  end

  @impl true
  def handle_call({:propose, policy}, _from, state) do

  end

  @impl true
  def handle_call(:log_state, _from, state), do: {:reply, "State: #{inspect(state)}", state}

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
