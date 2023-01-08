defmodule VotingWeb.ReactDelegateController do
  use VotingWeb, :controller

  def index(conn, _params) do
    json(conn, "hi")
#    conn |> send_resp(200, render_react_app())

  end

  def refresh(conn, _params) do
    alias VotingSystem.{Voter, VoterSupervisor}
    voters = [:p1, :p2, :p3]
    Enum.each(voters, fn voter -> VoterSupervisor.start_automated_child(voters, voter) end)
    json(conn, "refresh init")
  end

  # Serve index.html file. React will mount in the browser and take care of
  # client-side rendering and routing.
  defp render_react_app() do
#    Application.app_dir(:voting, "priv/static/webapp/index.html")
#    |> File.read!()

  end
end
