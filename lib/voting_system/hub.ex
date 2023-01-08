# THIS MODULE IS NO LONGER USED. PLEASE IGNORE, IT IS BEING KEPT HERE FOR POSTERITY.

defmodule VotingSystem.HubLegacy do
  use GenServer
  use TypedStruct

  @moduledoc """
  The Voting System Hub is responsible for starting, keeping track of, and communicating
  with all the voters registered with this application instance.
  """

  typedstruct enforce: true do
    # A map of voter token to voter process information.
    field :voters,
      %{required({String.t()}) => %{
        # The unique voter ID for this voter.
        :id => String.t(),

        # The process ID of the VotingSystem.Voter process.
        :pid => pid(),

        # Whether the voter is a real human interacting with the system.
        # If this is false, the voter won't be killed if a ping/pong fails.
        :is_live_voter => boolean(),
      }}
  end

  # Client Requests

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{
      voters: %{},
    })
  end

  def voter_connect(process_name, id) do
    process_name |> GenServer.call({:voter_connect, id})
  end

  # Server Callbacks

  @impl true
  def init(state) do
    {:ok, state}
  end

  @impl true
  def handle_call({:voter_connect, id}, _from, state) do
    if not voter_id_exists(state, id) do
      token = generate_voter_token(state)
      state = %{state | voters: Map.put(state.voters, token, %{})}
      {:reply, token, state}
    else
      {:reply, {:error, "Duplicate voter ID."}}
    end
  end

  # Private Helper Methods

  # Generates a unique voter ID. For added paranoia, this function
  # checks if the voter ID already exists in the state. If it does,
  # it forces the token to be regenerated.
  # This is somewhat redundant though as duplicate tokens would imply
  # predictability in secure random generation which highlights a large
  # flaw.
  defp generate_voter_token(state) do
    # Generate a unique token and only return it when it is guaranteed to be unique
    # to the current state.
    token = Base.encode64(:crypto.strong_rand_bytes(128))
    if Map.has_key?(state.voters, token), do: generate_voter_token(state), else: token
  end

  # Spawns a new voter process and returns a map with the information about it.
  defp create_voter(id) do
    %{
      id: id,
    }
  end

  # Fetches the voter ID for the voter with a specific token.
  defp voter_id_of_token(state, token), do: Map.get(state, token)[:id]

  # Check if the specified voter ID exists.
  defp voter_id_exists(state, id) do
    Map.values(state)
      |> Enum.filter(fn entry -> entry.id == id end)
      |> length
      |> Kernel.>(0)
  end

end

# THIS MODULE IS NO LONGER USED. PLEASE IGNORE, IT IS BEING KEPT HERE FOR POSTERITY.
