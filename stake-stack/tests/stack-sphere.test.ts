import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const contractOwner = accounts.get("deployer")!;
const user1 = accounts.get("wallet_1")!;
const user2 = accounts.get("wallet_2")!;
const admin = accounts.get("wallet_3")!;

const contractName = "stack-sphere";

describe("Stack-Sphere Staking Platform Contract", () => {
  beforeEach(() => {
    // Reset simnet state for each test
    simnet.mineEmptyBlocks(1);
  });

  describe("Contract Initialization", () => {
    it("should initialize with correct default values", () => {
      const stats = simnet.callReadOnlyFn(
        contractName,
        "get-contract-stats",
        [],
        contractOwner
      );
      
      expect(stats.result).toEqual(
        Cl.tuple({
          "total-staked": Cl.uint(0),
          "total-rewards-distributed": Cl.uint(0),
          "reward-rate": Cl.uint(100),
          "minimum-stake": Cl.uint(1000000),
          "reward-pool": Cl.uint(0),
          "contract-paused": Cl.bool(false)
        })
      );
    });

    it("should have correct staking tiers initialized", () => {
      const tier1 = simnet.callReadOnlyFn(
        contractName,
        "get-tier-info",
        [Cl.uint(1)],
        contractOwner
      );
      
      expect(tier1.result).toBeSome(
        Cl.tuple({
          "min-amount": Cl.uint(1000000),
          "reward-multiplier": Cl.uint(100),
          "lock-duration": Cl.uint(1008)
        })
      );

      const tier2 = simnet.callReadOnlyFn(
        contractName,
        "get-tier-info",
        [Cl.uint(2)],
        contractOwner
      );
      
      expect(tier2.result).toBeSome(
        Cl.tuple({
          "min-amount": Cl.uint(10000000),
          "reward-multiplier": Cl.uint(120),
          "lock-duration": Cl.uint(2016)
        })
      );

      const tier3 = simnet.callReadOnlyFn(
        contractName,
        "get-tier-info",
        [Cl.uint(3)],
        contractOwner
      );
      
      expect(tier3.result).toBeSome(
        Cl.tuple({
          "min-amount": Cl.uint(50000000),
          "reward-multiplier": Cl.uint(150),
          "lock-duration": Cl.uint(4032)
        })
      );
    });

    it("should recognize contract owner as admin", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-user-admin",
        [Cl.principal(contractOwner)],
        contractOwner
      );
      
      expect(result).toBeBool(true);
    });

    it("should not recognize regular users as admin", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-user-admin",
        [Cl.principal(user1)],
        contractOwner
      );
      
      expect(result).toBeBool(false);
    });
  });

  describe("Admin Functions", () => {
    it("should allow owner to add admin", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "add-admin",
        [Cl.principal(admin)],
        contractOwner
      );
      
      expect(result).toBeOk(Cl.bool(true));
      
      // Verify admin was added
      const isAdmin = simnet.callReadOnlyFn(
        contractName,
        "is-user-admin",
        [Cl.principal(admin)],
        contractOwner
      );
      
      expect(isAdmin.result).toBeBool(true);
    });

    it("should not allow non-owner to add admin", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "add-admin",
        [Cl.principal(admin)],
        user1
      );
      
      expect(result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });

    it("should allow owner to remove admin", () => {
      // First add admin
      simnet.callPublicFn(
        contractName,
        "add-admin",
        [Cl.principal(admin)],
        contractOwner
      );

      // Then remove admin
      const { result } = simnet.callPublicFn(
        contractName,
        "remove-admin",
        [Cl.principal(admin)],
        contractOwner
      );
      
      expect(result).toBeOk(Cl.bool(true));
      
      // Verify admin was removed
      const isAdmin = simnet.callReadOnlyFn(
        contractName,
        "is-user-admin",
        [Cl.principal(admin)],
        contractOwner
      );
      
      expect(isAdmin.result).toBeBool(false);
    });

    it("should allow admin to set reward rate", () => {
      const newRate = 150;
      const { result } = simnet.callPublicFn(
        contractName,
        "set-reward-rate",
        [Cl.uint(newRate)],
        contractOwner
      );
      
      expect(result).toBeOk(Cl.uint(newRate));
      
      // Verify rate was updated
      const stats = simnet.callReadOnlyFn(
        contractName,
        "get-contract-stats",
        [],
        contractOwner
      );
      
      expect(stats.result).toEqual(
        Cl.tuple({
          "total-staked": Cl.uint(0),
          "total-rewards-distributed": Cl.uint(0),
          "reward-rate": Cl.uint(newRate),
          "minimum-stake": Cl.uint(1000000),
          "reward-pool": Cl.uint(0),
          "contract-paused": Cl.bool(false)
        })
      );
    });

    it("should not allow non-admin to set reward rate", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "set-reward-rate",
        [Cl.uint(200)],
        user1
      );
      
      expect(result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });

    it("should allow admin to set minimum stake", () => {
      const newMinimum = 2000000;
      const { result } = simnet.callPublicFn(
        contractName,
        "set-minimum-stake",
        [Cl.uint(newMinimum)],
        contractOwner
      );
      
      expect(result).toBeOk(Cl.uint(newMinimum));
    });

    it("should allow admin to toggle pause", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "toggle-pause",
        [],
        contractOwner
      );
      
      expect(result).toBeOk(Cl.bool(true));
      
      // Verify contract is paused
      const stats = simnet.callReadOnlyFn(
        contractName,
        "get-contract-stats",
        [],
        contractOwner
      );
      
      expect(stats.result).toEqual(
        Cl.tuple({
          "total-staked": Cl.uint(0),
          "total-rewards-distributed": Cl.uint(0),
          "reward-rate": Cl.uint(100),
          "minimum-stake": Cl.uint(1000000),
          "reward-pool": Cl.uint(0),
          "contract-paused": Cl.bool(true)
        })
      );
    });

    it("should allow admin to fund reward pool", () => {
      const fundAmount = 5000000;
      const { result } = simnet.callPublicFn(
        contractName,
        "fund-reward-pool",
        [Cl.uint(fundAmount)],
        contractOwner
      );
      
      expect(result).toBeOk(Cl.uint(fundAmount));
      
      // Verify reward pool was funded
      const stats = simnet.callReadOnlyFn(
        contractName,
        "get-contract-stats",
        [],
        contractOwner
      );
      
      expect(stats.result).toEqual(
        Cl.tuple({
          "total-staked": Cl.uint(0),
          "total-rewards-distributed": Cl.uint(0),
          "reward-rate": Cl.uint(100),
          "minimum-stake": Cl.uint(1000000),
          "reward-pool": Cl.uint(fundAmount),
          "contract-paused": Cl.bool(false)
        })
      );
    });
  });

  describe("Read-Only Query Functions", () => {
    it("should return all tier information", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-all-tiers",
        [],
        user1
      );
      
      expect(result).toEqual(
        Cl.tuple({
          "tier-1": Cl.tuple({
            "min-amount": Cl.uint(1000000),
            "reward-multiplier": Cl.uint(100),
            "lock-duration": Cl.uint(1008)
          }),
          "tier-2": Cl.tuple({
            "min-amount": Cl.uint(10000000),
            "reward-multiplier": Cl.uint(120),
            "lock-duration": Cl.uint(2016)
          }),
          "tier-3": Cl.tuple({
            "min-amount": Cl.uint(50000000),
            "reward-multiplier": Cl.uint(150),
            "lock-duration": Cl.uint(4032)
          })
        })
      );
    });

    it("should return none for invalid tier", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-tier-info",
        [Cl.uint(999)],
        user1
      );
      
      expect(result).toBeNone();
    });

    it("should return none for non-staked user", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-staker-info",
        [Cl.principal(accounts.get("wallet_4")!)],
        user1
      );
      
      expect(result).toBeNone();
    });
  });
});


describe("Staking Functions", () => {
  beforeEach(() => {
    // Fund reward pool for tests
    simnet.callPublicFn(
      contractName,
      "fund-reward-pool",
      [Cl.uint(10000000)],
      contractOwner
    );
  });

  it("should allow user to stake minimum amount", () => {
    const stakeAmount = 1000000; // 1 STX
    const { result } = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(stakeAmount), Cl.uint(1008)],
      user1
    );
    
    expect(result).toBeOk(Cl.uint(stakeAmount));
    
    // Verify staker info
    const stakerInfo = simnet.callReadOnlyFn(
      contractName,
      "get-staker-info",
      [Cl.principal(user1)],
      user1
    );
    
    expect(stakerInfo.result).toBeSome(
      Cl.tuple({
        "amount": Cl.uint(stakeAmount),
        "start-block": Cl.uint(simnet.blockHeight),
        "last-claim-block": Cl.uint(simnet.blockHeight),
        "lock-duration": Cl.uint(1008),
        "total-earned": Cl.uint(0)
      })
    );
  });

  it("should allow user to stake tier 2 amount", () => {
    const stakeAmount = 10000000; // 10 STX
    const { result } = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(stakeAmount), Cl.uint(2016)],
      user1
    );
    
    expect(result).toBeOk(Cl.uint(stakeAmount));
  });

  it("should allow user to stake tier 3 amount", () => {
    const stakeAmount = 50000000; // 50 STX
    const { result } = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(stakeAmount), Cl.uint(4032)],
      user1
    );
    
    expect(result).toBeOk(Cl.uint(stakeAmount));
  });

  it("should reject stake below minimum amount", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(999999), Cl.uint(1008)],
      user1
    );
    
    expect(result).toBeErr(Cl.uint(105)); // ERR_MINIMUM_STAKE_NOT_MET
  });

  it("should reject stake with insufficient lock duration for tier", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(10000000), Cl.uint(1000)], // Tier 2 amount with tier 1 duration
      user1
    );
    
    expect(result).toBeErr(Cl.uint(108)); // ERR_INVALID_DURATION
  });

  it("should reject double staking by same user", () => {
    // First stake
    simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(1000000), Cl.uint(1008)],
      user1
    );

    // Second stake attempt
    const { result } = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(2000000), Cl.uint(1008)],
      user1
    );
    
    expect(result).toBeErr(Cl.uint(104)); // ERR_ALREADY_STAKED
  });

  it("should reject staking when contract is paused", () => {
    // Pause contract
    simnet.callPublicFn(
      contractName,
      "toggle-pause",
      [],
      contractOwner
    );

    const { result } = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(1000000), Cl.uint(1008)],
      user1
    );
    
    expect(result).toBeErr(Cl.uint(109)); // ERR_CONTRACT_PAUSED
  });
});

describe("Unstaking Functions", () => {
  beforeEach(() => {
    // Fund reward pool and stake for tests
    simnet.callPublicFn(
      contractName,
      "fund-reward-pool",
      [Cl.uint(10000000)],
      contractOwner
    );
    
    simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(1000000), Cl.uint(1008)],
      user1
    );
  });

  it("should reject unstaking before lock period expires", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "unstake",
      [],
      user1
    );
    
    expect(result).toBeErr(Cl.uint(106)); // ERR_LOCK_PERIOD_NOT_EXPIRED
  });

  it("should allow unstaking after lock period expires", () => {
    // Mine blocks to expire lock period
    simnet.mineEmptyBlocks(1009);

    const { result } = simnet.callPublicFn(
      contractName,
      "unstake",
      [],
      user1
    );
    
    expect(result).toBeOk(
      Cl.tuple({
        "staked-amount": Cl.uint(1000000),
        "rewards-claimed": Cl.some(Cl.uint(1)) // Some reward amount
      })
    );
  });

  it("should reject unstaking for non-staked user", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "unstake",
      [],
      user2
    );
    
    expect(result).toBeErr(Cl.uint(103)); // ERR_NOT_STAKED
  });

  it("should allow emergency unstake with penalty", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "emergency-unstake",
      [],
      user1
    );
    
    expect(result).toBeOk(
      Cl.tuple({
        "returned-amount": Cl.uint(900000), // 90% of staked amount
        "penalty-amount": Cl.uint(100000)   // 10% penalty
      })
    );
  });
});

describe("Reward Functions", () => {
  beforeEach(() => {
    // Fund reward pool, stake, and mine some blocks for rewards
    simnet.callPublicFn(
      contractName,
      "fund-reward-pool",
      [Cl.uint(10000000)],
      contractOwner
    );
    
    simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(1000000), Cl.uint(1008)],
      user1
    );
    
    // Mine blocks to generate rewards
    simnet.mineEmptyBlocks(100);
  });

  it("should calculate pending rewards correctly", () => {
    const { result } = simnet.callReadOnlyFn(
      contractName,
      "get-pending-rewards",
      [Cl.principal(user1)],
      user1
    );
    
    // Check that result is a uint and greater than 0
    expect(result).toBeUint(0);
    expect(Number((result as any).value)).toBeGreaterThan(0);
  });

  it("should allow claiming rewards", () => {
    // First get the pending rewards to know what to expect
    const pendingRewards = simnet.callReadOnlyFn(
      contractName,
      "get-pending-rewards",
      [Cl.principal(user1)],
      user1
    );
    
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-rewards",
      [],
      user1
    );
    
    expect(result).toBeOk(pendingRewards.result);
  });

  it("should reject claiming rewards when none available", () => {
    // Claim first
    simnet.callPublicFn(
      contractName,
      "claim-rewards",
      [],
      user1
    );

    // Try to claim again immediately
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-rewards",
      [],
      user1
    );
    
    expect(result).toBeErr(Cl.uint(107)); // ERR_REWARDS_NOT_AVAILABLE
  });

  it("should reject claiming rewards for non-staked user", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-rewards",
      [],
      user2
    );
    
    expect(result).toBeErr(Cl.uint(103)); // ERR_NOT_STAKED
  });
});

describe("Edge Cases and Error Handling", () => {
  it("should handle reward calculation with zero pending rewards", () => {
    // Stake but don't mine any blocks
    simnet.callPublicFn(
      contractName,
      "fund-reward-pool",
      [Cl.uint(10000000)],
      contractOwner
    );
    
    simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(1000000), Cl.uint(1008)],
      user1
    );

    const { result } = simnet.callReadOnlyFn(
      contractName,
      "get-pending-rewards",
      [Cl.principal(user1)],
      user1
    );
    
    expect(result).toBeUint(0);
  });

  it("should handle insufficient reward pool for claims", () => {
    // Small reward pool
    simnet.callPublicFn(
      contractName,
      "fund-reward-pool",
      [Cl.uint(1000)],
      contractOwner
    );
    
    simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(50000000), Cl.uint(4032)], // Large stake
      user1
    );
    
    // Mine many blocks to generate large rewards
    simnet.mineEmptyBlocks(1000);

    const { result } = simnet.callPublicFn(
      contractName,
      "claim-rewards",
      [],
      user1
    );
    
    expect(result).toBeErr(Cl.uint(101)); // ERR_INSUFFICIENT_BALANCE
  });

  it("should correctly handle multiple stake/unstake cycles", () => {
    simnet.callPublicFn(
      contractName,
      "fund-reward-pool",
      [Cl.uint(10000000)],
      contractOwner
    );

    // First stake cycle
    simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(1000000), Cl.uint(1008)],
      user1
    );
    
    // Emergency unstake
    simnet.callPublicFn(
      contractName,
      "emergency-unstake",
      [],
      user1
    );

    // Second stake cycle should work
    const { result } = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(2000000), Cl.uint(1008)],
      user1
    );
    
    expect(result).toBeOk(Cl.uint(2000000));
  });

  it("should return updated contract stats after staking", () => {
    simnet.callPublicFn(
      contractName,
      "fund-reward-pool",
      [Cl.uint(10000000)],
      contractOwner
    );
    
    simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(1000000), Cl.uint(1008)],
      user1
    );
    
    simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(10000000), Cl.uint(2016)],
      user2
    );

    const stats = simnet.callReadOnlyFn(
      contractName,
      "get-contract-stats",
      [],
      user1
    );
    
    expect(stats.result).toEqual(
      Cl.tuple({
        "total-staked": Cl.uint(11000000), // 1M + 10M from both users
        "total-rewards-distributed": Cl.uint(0),
        "reward-rate": Cl.uint(100),
        "minimum-stake": Cl.uint(1000000),
        "reward-pool": Cl.uint(10000000),
        "contract-paused": Cl.bool(false)
      })
    );
  });
});

describe("Integration Tests", () => {
  it("should handle complete staking lifecycle", () => {
    // Setup
    simnet.callPublicFn(
      contractName,
      "fund-reward-pool",
      [Cl.uint(10000000)],
      contractOwner
    );

    // Stake
    const stakeResult = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(10000000), Cl.uint(2016)],
      user1
    );
    expect(stakeResult.result).toBeOk(Cl.uint(10000000));

    // Mine blocks to generate rewards
    simnet.mineEmptyBlocks(500);

    // Claim rewards
    const claimResult = simnet.callPublicFn(
      contractName,
      "claim-rewards",
      [],
      user1
    );
    expect(claimResult.result).toBeOk(Cl.some(Cl.uint(1)));

    // Mine more blocks to expire lock
    simnet.mineEmptyBlocks(1600);

    // Unstake
    const unstakeResult = simnet.callPublicFn(
      contractName,
      "unstake",
      [],
      user1
    );
    expect(unstakeResult.result).toBeOk(
      Cl.tuple({
        "staked-amount": Cl.uint(10000000),
        "rewards-claimed": Cl.some(Cl.uint(1))
      })
    );
  });

  it("should handle multiple users staking different tiers", () => {
    simnet.callPublicFn(
      contractName,
      "fund-reward-pool",
      [Cl.uint(50000000)],
      contractOwner
    );

    // User 1: Tier 1
    const stake1 = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(1000000), Cl.uint(1008)],
      user1
    );
    expect(stake1.result).toBeOk(Cl.uint(1000000));

    // User 2: Tier 2
    const stake2 = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(10000000), Cl.uint(2016)],
      user2
    );
    expect(stake2.result).toBeOk(Cl.uint(10000000));

    // Contract owner: Tier 3
    const stake3 = simnet.callPublicFn(
      contractName,
      "stake",
      [Cl.uint(50000000), Cl.uint(4032)],
      contractOwner
    );
    expect(stake3.result).toBeOk(Cl.uint(50000000));

    // Check total staked
    const stats = simnet.callReadOnlyFn(
      contractName,
      "get-contract-stats",
      [],
      user1
    );
    
    expect(stats.result).toEqual(
      Cl.tuple({
        "total-staked": Cl.uint(61000000),
        "total-rewards-distributed": Cl.uint(0),
        "reward-rate": Cl.uint(100),
        "minimum-stake": Cl.uint(1000000),
        "reward-pool": Cl.uint(50000000),
        "contract-paused": Cl.bool(false)
      })
    );
  });
});
