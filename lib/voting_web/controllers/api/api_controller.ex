defmodule VotingWeb.ApiController do
  use VotingWeb, :controller

  def refresh(conn, _params) do
    json(conn, %{id: 123})
  end
end
