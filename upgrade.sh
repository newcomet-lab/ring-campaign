#!/usr/bin/env bash
#solana airdrop 10
anchor upgrade --program-id GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2 ./target/deploy/contracts.so
anchor idl upgrade --filepath ./target/idl/contracts.json GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2
