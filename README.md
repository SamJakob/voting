# Voting

Base project has been set up with:  
https://bpaulino.com/entries/modern-webapps-with-elixir-phoenix-typescript-react

To start your Phoenix server:

  * Install dependencies with `mix deps.get`
  * Build web application with `mix webapp`
  * Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

[//]: # (  * Create and migrate your database with `mix ecto.setup`)

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Starting Voters (Simulated)
```elixir
alias VotingSystem.{Voter, VoterSupervisor}
VoterSupervisor.start_automated_voters(3)
```
