defmodule VotingWeb.ApiController do
  use VotingWeb, :controller

  require UUID
  alias VotingSystem.VoterSupervisor

  # Used by the client to request an ID.
  def preflight(conn, _params) do
    # Generate a unique ID as a string.
    id = UUID.uuid4()

    # Allocate an atom for the ID.
    _ = String.to_atom(id)

    # Return the originally generated ID.
    json(conn, id)
  end

  def refresh(conn, _params) do
    active_voters = VoterSupervisor.get_active_voters()
    json(conn, %{voters: active_voters})
  end
  
  def spawn(conn, %{"count" => count}) do
    VoterSupervisor.start_automated_voters(String.to_integer(count))
    json(conn, "Spawned #{count} voter(s) successfully!")
  end

  def terminate_all(conn, _params) do
    VoterSupervisor.kill_all_voters()
    json(conn, "Terminated all voters successfully!")
  end

  def terminate(conn, %{"id" => id}) do
    result = try do
      voter_id = String.to_existing_atom(id)

      if VoterSupervisor.has_active_voter_id?(voter_id) do
        VoterSupervisor.kill_voter(voter_id)
        {:ok, "Terminated #{id} successfully."}
      else
        {:bad_request, "That voter ID does not exist."}
      end
    rescue
      ArgumentError -> {:bad_request, "That voter ID is invalid."}
    end

    conn
      |> put_status(elem(result, 0))
      |> json(elem(result, 1))
  end
end
