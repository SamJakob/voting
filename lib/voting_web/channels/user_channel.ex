defmodule VotingWeb.UserChannel do
  use VotingWeb, :channel

  import VotingSystem.Policy
  alias VotingSystem.{Voter, VoterSupervisor}

  @impl true
  def join("voter:" <> user_id, _params, socket) do
    if user_id == socket.assigns.raw_voter_id do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_in("join_network", _params, socket) do
    # Kill the voter process if they are already on the network.
    if VoterSupervisor.has_active_voter_id?(socket.assigns.voter_id) do
      VoterSupervisor.kill_voter(socket.assigns.voter_id)
    end

    # Re-add the voter to the network.
    VoterSupervisor.start_voter(socket.assigns.voter_id)
    {:reply, {:ok, "You have joined the network as: #{socket.assigns.raw_voter_id}!"}, socket}
  end

  @impl true
  def handle_in("leave_network", _params, socket) do
    if VoterSupervisor.has_active_voter_id?(socket.assigns.voter_id) do
      VoterSupervisor.kill_voter(socket.assigns.voter_id)
    end

    {:reply, {:ok, "You have left the network."}, socket}
  end

  @impl true
  def handle_in(
    "propose",
    %{"coordinates" => coordinates_raw, "description" => description},
    socket
  ) do
    proposal = policy(
      coordinates: {Enum.at(coordinates_raw, 0), Enum.at(coordinates_raw, 1)},
      description: description
    )

    if VoterSupervisor.has_active_voter_id?(socket.assigns.voter_id) do
      result = Voter.propose(socket.assigns.voter_id, proposal)

      case result do
        {:abort} -> {:reply, {:error, "Your policy vote was interrupted and couldn't continue."}, socket}
        {:timeout} -> {:reply, {:error, "Your policy wasn't passed."}, socket}
        {:decision, _} -> {:reply, {:ok, "Congratulations! Your policy, #{policy(proposal, :description)}, has passed."}, socket}
      end
    else
      {:reply, {:error, "We couldn't process your proposal. You don't seem to be registered."}, socket}
    end
  end

#  # Channels can be used in a request/response fashion
#  # by sending replies to requests from the client
#  @impl true
#  def handle_in("ping", payload, socket) do
#    {:reply, {:ok, payload}, socket}
#  end
#
#  # It is also common to receive messages from the client and
#  # broadcast to everyone in the current topic (user:lobby).
#  @impl true
#  def handle_in("shout", payload, socket) do
#    broadcast(socket, "shout", payload)
#    {:noreply, socket}
#  end
end
