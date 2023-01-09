defmodule VotingWeb.ApiController do
  use VotingWeb, :controller
  import VotingSystem.Policy

  alias VotingSystem.{Voter, VoterSupervisor}

  def refresh(conn, _params) do
    active_voters = VoterSupervisor.get_active_voters()
    json(conn, %{voters: active_voters})
  end

  def propose(conn, %{"coordinates" => coordinates_raw, "description" => description}) do
    policy(
      coordinates: {Enum.at(coordinates_raw, 0), Enum.at(coordinates_raw, 1)},
      description: description
    )

    json(conn, "(TODO) Dispatched your policy proposal: #{description}")
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
