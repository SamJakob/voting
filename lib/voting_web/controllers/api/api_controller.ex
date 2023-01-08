defmodule VotingWeb.ApiController do
  use VotingWeb, :controller

  def refresh(conn, _params) do
    alias VotingSystem.{Voter, VoterSupervisor}
    voters = [:p1, :p2, :p3]
    Enum.each(voters, fn voter -> VoterSupervisor.start_automated_child(voters, voter) end)
    json(conn, "refresh init")
  end
end
