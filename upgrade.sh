#!/usr/bin/env bash
#solana airdrop 10
anchor upgrade --program-id GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2 ./target/deploy/datafarm.so
anchor upgrade --program-id HgaSDFf4Vc9gWajXhNCFaAC1epszwqS2zzbAhuJpA5Ev ./target/deploy/staking.so
anchor idl upgrade --filepath ./target/idl/contracts.json GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2
anchor idl upgrade --filepath ./target/idl/staking.json HgaSDFf4Vc9gWajXhNCFaAC1epszwqS2zzbAhuJpA5Ev
