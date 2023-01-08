defmodule VotingWeb.Router do
  use VotingWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, {VotingWeb.LayoutView, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  ##############################################################
#
  ## Browser Requests
  # These are intended to mount the React frontend app in the browser by
  # serving static content.

  scope "/", VotingWeb do
    get "/", ReactDelegateController, :index
  end

  scope "/app", VotingWeb do
    get "/", ReactDelegateController, :index
    get "/*path", ReactDelegateController, :index
  end

  ##############################################################

  ## API Requests
  # Called by the React frontend app to execute tasks on the backend.

   # Other scopes may use custom stacks.
   scope "/api", VotingWeb do
     pipe_through :api

     get "/refresh", ApiController, :refresh
     post "/spawn/:candidates", ApiController, :spawn
   end

  # Enables LiveDashboard only for development
  #
  # If you want to use the LiveDashboard in production, you should put
  # it behind authentication and allow only admins to access it.
  # If your application does not have an admins-only section yet,
  # you can use Plug.BasicAuth to set up some basic authentication
  # as long as you are also using SSL (which you should anyway).
  if Mix.env() in [:dev, :test] do
    import Phoenix.LiveDashboard.Router

    scope "/" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: VotingWeb.Telemetry
    end
  end

  # Enables the Swoosh mailbox preview in development.
  #
  # Note that preview only shows emails that were sent by the same
  # node running the Phoenix server.
  if Mix.env() == :dev do
    scope "/dev" do
      pipe_through :browser

      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
