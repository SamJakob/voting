defmodule Voting.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @voterRegistry :voter_registry

  @impl true
  def start(_type, _args) do
    children = [
      # (Database) Start the Ecto repository
      # Voting.Repo,
      # (Logging and Telemetry) Start the Telemetry supervisor
      VotingWeb.Telemetry,
      # (Pub/Sub Messaging) Start the PubSub system
      {Phoenix.PubSub, name: Voting.PubSub},
      # (HTTP(S) and WebSocket Endpoints) Start the Endpoint (http/https)
      VotingWeb.Endpoint,
      # (Voter Pool) Start the VoterSupervisor process for the Voter processes.
      # This could later be wrapped with a PartitionSupervisor.
      {VotingSystem.VoterSupervisor, []},
      {Registry, [keys: :unique, name: @voterRegistry]}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Voting.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    VotingWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
