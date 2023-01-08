defmodule VotingSystem.VoterSupervisor do
  use DynamicSupervisor
  require UUID

  # The possible values for the 'tolerance' of a voter to policies.
  # Higher tolerance means more likely to accept policies that are not their own.
  @simTolerance 3..6

  def start_link(_arg) do
    DynamicSupervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def start_child(active_voters, voter_id, simulation_parameters \\ nil) do
    # Start the Voter using the specification provided by the `child_spec/1` function
    # in the VotingSystem.Voter module.
    DynamicSupervisor.start_child(
      __MODULE__,
      {VotingSystem.Voter, {voter_id, active_voters, simulation_parameters}}
    )
  end

  @doc """
  Starts a process for a human (live) voter.
  """
  def start_voter(active_voters, voter_id), do: start_child(active_voters, voter_id)

  @doc """
  Starts a process for a single automated (simulated) voter.
  """
  def start_automated_voter(active_voters, voter_id \\ nil) do
    voter_id = if voter_id != nil, do: voter_id, else: String.to_atom(UUID.uuid4())
    coordinates = {Enum.random(-10..10), Enum.random(-10..10)}
    tolerance = Enum.random(@simTolerance)

    start_child(active_voters, voter_id, %{
      coordinates: coordinates,
      tolerance: tolerance
    })
  end

  @doc """
  Starts the specified number of processes as automated (simulated) voters.
  """
  def start_automated_voters(count) when count > 0 do
    voters = for n <- 1..count, do: String.to_atom(UUID.uuid4())
    Enum.each(voters, fn voter -> start_automated_voter(voters, voter) end)
  end

  @impl true
  def init(_arg) do
    # Start processes with the :one_to_one strategy, such that if a child process crashes,
    # only that process is crashed.
    DynamicSupervisor.init(strategy: :one_for_one)
  end

end