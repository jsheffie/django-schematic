import subprocess
from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class CustomBuildHook(BuildHookInterface):
    def initialize(self, version, build_data):
        subprocess.run(["npm", "ci"], cwd="ui", check=True)
        subprocess.run(["npm", "run", "build"], cwd="ui", check=True)
