defmodule Mix.Tasks.Webapp do

  use Mix.Task
  require Logger

  # Path to the static assets that should be served server-side.
  @public_path "./priv/static/webapp"

  def run(_) do
    Logger.info("Installing NPM packages")
    run_command("npm", ["install", "--quiet"], "./frontend")

    Logger.info("Compiling React frontend")
    run_command("npm", ["run", "build"], "./frontend")

    Logger.info("Moving dist/ folder to Pheonix's public path: #{@public_path}")

    if elem(:os.type(), 0) == :win32 do
      run_command("if exist", [String.replace(@public_path, "/", "\\"), "rmdir", String.replace(@public_path, "/", "\\"), "/s/q"])
      run_command("xcopy", [".\\frontend\\dist", String.replace(@public_path, "/", "\\"), "/E/K/H/I"])
    else
      run_command("rm", ["-rf", @public_path])
      run_command("cp", ["-R", "./frontend/dist", @public_path])
    end

    Logger.info("All done!")
  end

  defp run_command(command, args, cwd \\ nil) do
    if elem(:os.type(), 0) == :win32 do
      win_args = ["/c", command] ++ args
      if cwd != nil, do: System.cmd("cmd", win_args, cd: cwd), else: System.cmd("cmd", win_args)
    else
      if cwd != nil, do: System.cmd(command, args, cd: cwd), else: System.cmd(command, args)
    end
  end

end
