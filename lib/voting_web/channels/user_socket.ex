defmodule VotingWeb.UserSocket do
  use Phoenix.Socket

  alias VotingSystem.{VoterSupervisor}

  defoverridable init: 1

  @impl true
  def init(state) do
    res = {:ok, {_, socket}} = super(state)
    on_connect(self(), socket.assigns.raw_voter_id, socket.assigns.voter_id)
    res
  end

  # A Socket handler
  #
  # It's possible to control the websocket connection and
  # assign values that can be accessed by your channel topics.

  ## Channels
  channel "voter:*", VotingWeb.UserChannel

  # To accept connection, return `:ok`, the socket is placed in the second
  # parameter which can be used for default assigns, such as ID.
  # To deny connection, return `:error`.
  @impl true
  def connect(%{"id" => raw_voter_id}, socket, _connect_info) do
    try do
      # Assign the atom to the socket as :voter_id.
      socket = assign(socket, :voter_id, String.to_existing_atom(raw_voter_id))
      # Then, assign the raw string as :raw_voter_id.
      {:ok, assign(socket, :raw_voter_id, raw_voter_id)}
    rescue ArgumentError -> {:error, %{reason: "invalid"}}
    end
  end

  @doc """
  Watches for a process spawn to handle an incoming WebSocket. This allows us
  to spawn a Voter for the WebSocket user, as well as to monitor for disconnects.
  """
  def on_connect(pid, raw_voter_id, voter_id) do
    monitor(pid, raw_voter_id, voter_id)
  end

  @doc """
  Watches for process termination, to kill the voter spawned to handle requests for
  the WebSocket.
  """
  def on_disconnect(_raw_voter_id, voter_id) do
    # Kill the voter process for this user ID if there is one.
    if VoterSupervisor.has_active_voter_id?(voter_id) do
      VoterSupervisor.kill_voter(voter_id)
    end
  end

  # Socket id's are topics that allow you to identify all sockets for a given user:
  #
  #     def id(socket), do: "user_socket:#{socket.assigns.user_id}"
  #
  # Would allow you to broadcast a "disconnect" event and terminate
  # all active sockets and channels for a given user:
  #
  #     Elixir.VotingWeb.Endpoint.broadcast("user_socket:#{user.id}", "disconnect", %{})
  #
  # Returning `nil` makes this socket anonymous.
  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.raw_voter_id}"

  defp monitor(pid, raw_voter_id, voter_id) do
    Task.Supervisor.start_child(VotingWeb.TaskSupervisor, fn ->
      Process.flag(:trap_exit, true)
      ref = Process.monitor(pid)

      receive do
        {:DOWN, ^ref, :process, _pid, _reason} -> on_disconnect(raw_voter_id, voter_id)
      end
    end)
  end
end
