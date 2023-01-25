import Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :voting, VotingWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "OnMHtGcEcnu67k8GKReGNvTs11TIz9LJSt/O4XqSictDVJA40NHe/cXY6nDoOmhk",
  server: false

# In test we don't send emails.
config :voting, Voting.Mailer, adapter: Swoosh.Adapters.Test

# Print only warnings and errors during test
config :logger, level: :warn

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime
