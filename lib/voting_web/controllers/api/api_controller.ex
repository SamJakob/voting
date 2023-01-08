defmodule VotingWeb.ApiController do
  use VotingWeb, :controller

  alias VotingSystem.{Voter, VoterSupervisor}

  def refresh(conn, _params) do
    active_voters = VoterSupervisor.get_active_voters()
    json(conn, %{voters: active_voters})
  end
  
  def spawn(conn, _params) do
    VoterSupervisor.start_automated_voters(String.to_integer(Map.get(_params, "candidates")))
    json(conn, "Spawned succesfully")
  end
end
