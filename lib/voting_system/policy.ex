defmodule VotingSystem.Policy do
  require Record

  Record.defrecord(:policy, coordinates: nil, description: nil, additional_data: nil)
end