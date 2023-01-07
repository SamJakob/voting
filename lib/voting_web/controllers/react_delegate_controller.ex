defmodule VotingWeb.ReactDelegateController do
  use VotingWeb, :controller

  def index(conn, _params) do
    conn
      |> send_resp(200, render_react_app())
  end

  # Serve index.html file. React will mount in the browser and take care of
  # client-side rendering and routing.
  defp render_react_app() do
    Application.app_dir(:voting, "priv/static/webapp/index.html")
    |> File.read!()
  end
end
