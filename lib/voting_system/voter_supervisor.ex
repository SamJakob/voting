defmodule VotingSystem.VoterSupervisor do
  use DynamicSupervisor
  require UUID

  alias VotingSystem.Voter

  # The possible values for the 'tolerance' of a voter to policies.
  # Higher tolerance means more likely to accept policies that are not their own.
  @simTolerance 3..6

  @voterRegistry :voter_registry

  def start_link(_arg) do
    DynamicSupervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def start_child(active_voters, voter_id, simulation_parameters \\ nil) do
    # Start the Voter using the specification provided by the `child_spec/1` function
    # in the Voter module.
    DynamicSupervisor.start_child(
      __MODULE__,
      {Voter, {voter_id, active_voters, simulation_parameters}}
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
    voters = for _ <- 1..count, do: String.to_atom(UUID.uuid4())
    Enum.each(voters, fn voter -> start_automated_voter(voters, voter) end)
  end

  @doc """
  Fetches the process IDs of all active voters in the system.
  This probably isn't very useful on its own as the GenServer for voters relies on a Voter ID.
  You can can, instead, get a list of voter IDs by using get_active_voter_ids/0.
  """
  def get_active_voter_pids() do
    DynamicSupervisor.which_children(__MODULE__)
      # Get worker processes with the Voter module in the child specification...
      |> Enum.filter(fn entry -> elem(entry, 2) == :worker and Enum.member?(elem(entry, 3), Voter) end)
      # Map the result to just the PID (all the other information is redundant or unnecessary).
      |> Enum.map(fn entry -> elem(entry, 1) end)
  end

  @doc """
  Fetches the list of Voter IDs currently registered and active in the system.
  """
  def get_active_voter_ids() do
    Enum.map(get_active_voter_pids(), fn pid -> Enum.at(Registry.keys(@voterRegistry, pid), 0) end)
  end

  @doc """
  Fetches the list of currently active voter processes registered with the supervisor.
  If `detailed` is set to true (which is the default), the result is a tuple:
  {total_active_voters, simulated_voters, human_voters}
  Otherwise, if `detailed` is set to false, just the total active voters is returned.
  """
  def get_active_voter_count(detailed \\ true) do
    total_active_voters = DynamicSupervisor.count_children(__MODULE__)[:workers] || 0

    if detailed do
      voters = Enum.map(get_active_voter_ids(), fn voter -> Voter.is_simulated(voter) end)
      simulated_voters = Enum.count(voters, fn is_simulated -> is_simulated end)
      human_voters = Enum.count(voters, fn is_simulated -> !is_simulated end)
      {total_active_voters, simulated_voters, human_voters}
    else
      total_active_voters
    end
  end

  def get_active_voters() do
    voters = Enum.map(get_active_voter_ids(), fn voter -> Voter.get_overview(voter) end)
  end

  @doc """
  Kills the voter with the specified voter ID with :normal to indicate that the process is
  being killed on account of no longer being used. This prevents the supervisor from
  automatically restarting the voter.
  """
  def kill_voter(voter_id), do: Voter.stop(voter_id, :normal)

  @doc """
  Convenience method to kill all voter processes actively registered in the system using
  kill_voter/1.
  """
  def kill_all_voters(), do: Enum.each(get_active_voter_ids(), fn voter -> kill_voter(voter) end)

  @impl true
  def init(_arg) do
    # Start processes with the :one_to_one strategy, such that if a child process crashes,
    # only that process is crashed.
    DynamicSupervisor.init(strategy: :one_for_one)
  end

end