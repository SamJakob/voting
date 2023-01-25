# Voting

## Running

1. To fetch dependencies (necessary for console and web interface):
  
  * Install dependencies with `mix deps.get`
  * Use the Elixir API (and load dependencies) in IEx with `iex -S mix`

2. To start your Phoenix server (necessary only for web interface):

  * Build web application with `mix webapp`
    * You will need the latest version of Node.js and NPM.
    * If you experience problems with this, you can `cd frontend/` and run:
      * `npm install`
      * `npm run build`
  * Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

## Usage of Paxos
For our final submission, we decided that the most satisfying
and clear use of Paxos for this voting system was to store the
voting history of the voting system.

To achieve this, each voter spawns a Paxos instance, `history_paxos`.
Every time a vote from the voting system is concluded, Paxos is used to store
and distribute the result amongst each Voter so every participant has an
up-to-date view of the accepted policies.

### Safety
TODO

### Liveness
TODO

## REST API

TODO

## Elixir API

The interfaces for the Voting system are separate
from the rest of the system (web interface, etc.,).
To make interacting with them more fluent, you can
tell Elixir that the most commonly used classes,
`Voter` and `VoterSupervisor` belong to the 
`VotingSystem` module as follows:
```elixir
alias VotingSystem.{Voter, VoterSupervisor}
```

**NOTE: The following examples assume that you have
these aliases set.**

### Voter and Process IDs

API methods in the `VotingSystem` modules generally
use the **voter ID** rather than a **Process ID** (PID) to identify
the target of a method call. So, for example, if you started a voter
as follows:
```elixir
my_voter_pid = VoterSupervisor.start_voter!(:my_voter)
```
...you would typically use `:my_voter` in method calls, rather than
`my_voter_pid`. Even, to kill the process it is recommended to use
`VoterSupervisor.kill_voter(:my_voter)`.

This is possible because the Elixir `Registry` is used to keep track
of the PID <-> Voter ID association, and using the Voter IDs instead
of Process IDs allows the system to operate correctly at scale, as when
the system is distributed across multiple nodes they would not know
about, or control, each other's processes.

This is recommended and ideal as it allows `VoterSupervisor` to keep
track of the global system state.

### Voter (`voter.ex`)
_Voters spawn Paxos instances to propose and vote on
policies within the system._ 

#### Starting a voter

Voters are implemented using `GenServer`. As such,
you can start an individual `Voter` process with
[`GenServer.start_link/3`](https://hexdocs.pm/elixir/1.14.3/GenServer.html#start_link/3),
and provide `id` (atom), `active_voters` (list of atoms
of other voters participating in the system) and
`simulation_parameters` (optional set of parameters to allow
the Voter to automatically vote - may be `nil`).

This would be unusual though, as a `VoterSupervisor`
abstracts and manages all the per-Voter details (such as
maintaining the list of active voters within the system)
and provides convenience methods for this.

For details on these methods, please see the `VoterSupervisor`
section.

#### Human and Simulated Voters
A `Voter` is a representative, within the system, of some entity with
the ability to vote or propose policies.

- **Human voters** are controlled directly by a human. They currently do
not participate in the pass/reject voting process (as this is just a minimal
proof of concept) but could in a real system, they can however arbitrarily
propose policies to be voted on and added to the history. **For the purposes
of the demo, 'Human' voters will automatically vote to pass any proposal they
encounter.**

    In the context of the web application, human voters are spawned
    as soon as someone visits the page and are destroyed once they
    leave the page.

- **Simulated voters** are automated, based on the parameters supplied to
them on startup. They cannot propose policies, however they can vote on
policies that have been proposed.

    In the context of the web application, simulated voters are spawned
    when the instance is set up or arbitrarily afterwards.

Both kinds of voters hold a correct and consistent history of all policies
that have been passed or rejected (i.e., sessions) using Paxos. 

#### Proposing a policy
```elixir
# Aliases as defined above.
import VotingSystem.Policy

proposal = policy(
  coordinates: {5, -5},
  description: "Free ice cream"
)

# PLEASE NOTE THAT THIS IS NOT CONSIDERED TO BE THE USE OF PAXOS
# WITHIN THIS SYSTEM. THE VOTING PROCEDURE JUST USES A PAXOS-LIKE
# APPROACH.
case Voter.propose(:v1, proposal) do
  {:abort} -> "Policy vote was interrupted."
  {:timeout} -> "Policy failed to pass."
  {:decision, _} -> "Your policy, '#{policy(proposal, :description)}', passed successfully!"
end
```

#### All Methods
- ```elixir
  start_link(voter_id , simulation_parameters \\ nil, active_voters \\ [])
  ```  

    Used to start a new Voter process. `voter_id` is an atom used to
    identify this process globally and uniquely within the system.

    `active_voters` can optionally be specified to indicate the list of active
    voters in the system, but this is not used when a `VoterSupervisor` is used
    (except possibly during initialization) as the `VoterSupervisor` will
    subsequently make a call to update the list of voters such that each `Voter`
    in the system is up-to-date and consistent on the list of voters. When not
    specified, this value will initialize to just being the Voter itself.
    
    `simulation_parameters` may optionally be specified to make the Voter a simulated
    voter, where `simulation_parameters.coordinates` (`{integer(), integer()}`)
    may be specified (with each axis from `-10` to `10`) and
    `simulation_parameters.tolerance` may be specified as a radius of
    acceptable proposal coordinates. (`0` is only identical coordinates,
    `30` is any proposal is accepted).

    https://www.desmos.com/calculator/n0mhfhuz85

- ```elixir
  stop(voter_id, reason)
  ```

    Used to stop the Voter process. If `reason` is not `:normal`, the
    supervisor will automatically restart the `Voter` process.
    `voter_id` is the ID of the voter process, not its PID (see 'Voter
    and Process IDs' above).

- ```elixir
  propose(voter_id, policy)
  ```

    Propose a `policy`, the `VotingSystem.Policy` record is provided for
    convenience and clarity when defining a policy to use here.
    `voter_id` is the ID of the voter process, not its PID (see 'Voter
    and Process IDs' above).

- ```elixir
  is_simulated(voter_id)
  ```

    Check if a Voter is simulated (`true`) or human (`false`). Simply
    returns the boolean depending on which is the case.

- ```elixir
  get_overview(voter_id)
  ```

    Primarily for debugging, gets an overview of Voter process state, by
    simply printing relevant bits of state. (Excludes 'private' information
    such as the Paxos cookie.)

- ```elixir
  update_voters(voter_id, voters)
  ```

    Updates the list of voters that this voter will talk to. The voter
    in question, as specified by `voter_id`, will then update its Paxos
    instances to also reflect this change.

### VoterSupervisor (`voter_supervisor.ex`)

#### Starting Human Voters

You can start a voter with:
```elixir
alias VotingSystem.{Voter, VoterSupervisor}
VoterSupervisor.start_voter!(:my_voter)
# PIDs are returned but are generally not needed for API as Elixir's
# registry is used. See above.
```

(or, probably more usefully, start multiple voters as follows):
```elixir
alias VotingSystem.{Voter, VoterSupervisor}
Enum.each([:v1, :v2, :v3], fn v -> VoterSupervisor.start_voter!(v) end)

# PIDs are returned but are generally not needed for API as Elixir's
# registry is used. See above.

# Additionally, as new voters join and leave the system, it automatically
# updates each voter to ensure they have a correct list of voters.
```

#### Starting Simulated Voters
```elixir
alias VotingSystem.{Voter, VoterSupervisor}
VoterSupervisor.start_automated_voters(3)
VoterSupervisor.get_active_voters()
# PIDs are returned but are generally not needed for API as Elixir's
# registry is used. See above.
```

#### All Methods

- ```elixir
  start_voter(voter_id \\ nil)
  ```

  Convenience method that causes the supervisor to start a (human) voter with the specified
  voter_id. If `voter_id` is not specified, a UUID will be internally defined and used.

- ```elixir
  start_voter!(voter_id)
  ```

  Like `start_voter/1` but returns the PID, directly, on :ok and raises on non-:ok.
  Mostly useful for command-line demos where we want to be sure that the Voter started
  successfully.

- ```elixir
  start_automated_voter(voter_id \\ nil, atomic \\ false)
  ```

  Starts a process for a single automated (simulated) voter.
  `atomic` denotes whether the list of participants in the system should _not_ be
  updated after this method call. This is useful when multiple participants are to be
  added to the system at once (`atomic` can be set to true and the participants can be
  subsequently updated in one go.)

- ```elixir
  start_automated_voters(count)
  ```

  See `start_automated_voter/2`, but starts multiple automated voters using the
  approach suggested.

- ```elixir
  get_active_voter_pids()
  ```

  Fetches the process IDs of all active voters in the system.
  This probably isn't very useful on its own as the GenServer for voters relies on a Voter ID.
  You can can, instead, get a list of voter IDs by using `get_active_voter_ids/0`.

- ```elixir
  get_active_voter_ids()
  ```

  Fetches the list of Voter IDs currently registered and active in the system.

- ```elixir
  has_active_voter_id?(id)
  ```

  Checks if a voter ID is registered with the system. This has the benefit of exiting
  early if the voter ID is found.

- ```elixir
  get_voter_by_id(id)
  ```

  Looks up a voter by the specified ID and returns its PID.

- ```elixir
  get_active_voter_count(detailed \\ true)
  ```

  Fetches the list of currently active voter processes registered with the supervisor.
  If `detailed` is set to true (which is the default), the result is a tuple:
  `{total_active_voters, simulated_voters, human_voters}`
  Otherwise, if `detailed` is set to false, just the total active voters is returned.

- ```elixir
  get_active_voters()
  ```

  Fetches a detailed list of each active voter in the system. This is useful for displaying
  or debugging application state.

- ```elixir
  kill_voter(voter_id, atomic \\ false)
  ```

  Kills the voter with the specified voter ID with :normal to indicate that the process is
  being killed on account of no longer being used. This prevents the supervisor from
  automatically restarting the voter.

- ```elixir
  kill_all_voters()
  ```

  Convenience method to kill all voter processes actively registered in the system using
  kill_voter/1.