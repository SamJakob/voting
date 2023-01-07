defmodule VotingWeb.PageController do
  use VotingWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
