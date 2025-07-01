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