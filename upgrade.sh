#!/usr/bin/env bash
#solana airdrop 10
anchor upgrade --program-id GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2 ./target/deploy/contracts.so
anchor idl upgrade GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2 ./target/idl/contracts.json
