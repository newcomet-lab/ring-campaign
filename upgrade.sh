#!/usr/bin/env bash
#solana airdrop 10
anchor upgrade --program-id 2bFt7FK3K8DjjeJCXrv9fqhc34SPo2mWWMNqWgANJngJ ./target/deploy/datafarm.so
anchor upgrade --program-id DQU8naysQoj3t9EEhDcFt8LUyGSTJrxMVXYFwviHshYF ./target/deploy/staking.so
anchor idl upgrade --filepath ./target/idl/contracts.json 2bFt7FK3K8DjjeJCXrv9fqhc34SPo2mWWMNqWgANJngJ
anchor idl upgrade --filepath ./target/idl/staking.json DQU8naysQoj3t9EEhDcFt8LUyGSTJrxMVXYFwviHshYF
