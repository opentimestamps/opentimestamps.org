{
  description = "Development environment for opentimestamps.org";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          nodejs =
            if pkgs ? nodejs_20 then pkgs.nodejs_20
            else if pkgs ? nodejs_18 then pkgs.nodejs_18
            else pkgs.nodejs;
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs
              imagemagick
              python3
              gnumake
              gcc
              pkg-config
              rsync
            ];

            shellHook = ''
              export npm_config_python=${pkgs.python3}/bin/python3

              cat <<'EOF'
              opentimestamps.org dev shell

              Common commands:
                npm install --include=dev
                npx gulp
                npx gulp server
                npm start
              EOF
            '';
          };
        });
    };
}
