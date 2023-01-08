defmodule Helpers.Crypto do

  def base64_secure_token(length \\ 128) do
    Base.encode64(:crypto.strong_rand_bytes(length))
  end

end