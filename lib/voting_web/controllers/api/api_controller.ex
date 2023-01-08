defmodule VotingWeb.ApiController do
  use VotingWeb, :controller

  alias VotingSystem.{Voter, VoterSupervisor}

  def refresh(conn, _params) do
    VoterSupervisor.start_automated_voters(3)
    json(conn, "refresh init")
  end
end
