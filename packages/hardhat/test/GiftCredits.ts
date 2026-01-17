import { expect } from "chai";
import { ethers } from "hardhat";

// 覆盖高频打赏系统的核心流程：购买 credits、打赏、兑付原生币与双向兑换。
describe("GiftCredits1155", function () {
  it("buy -> tip -> withdrawNative -> redeem flow", async () => {
    const [admin, streamer, user] = await ethers.getSigners();
    const Gift = await ethers.getContractFactory("GiftCredits1155");
    const gift = await Gift.deploy("ipfs://gifts/{id}.json", admin.address, 1, [ethers.parseEther("0.001")]);
    await gift.waitForDeployment();

    await gift.connect(admin).addStreamer(streamer.address);

    await expect(gift.connect(user).buyWithNative(1, 5, { value: ethers.parseEther("0.005") }))
      .to.emit(gift, "GiftPurchased")
      .withArgs(user.address, 1, 5, ethers.parseEther("0.005"));

    await expect(gift.connect(user).tip(streamer.address, 1, 2, 7))
      .to.emit(gift, "Tipped")
      .withArgs(streamer.address, user.address, 1, 2, 7);

    await expect(
      gift.connect(admin).withdrawNative(streamer.address, 1, 2, streamer.address, {
        value: ethers.parseEther("0.002"),
      }),
    )
      .to.emit(gift, "Withdrawn")
      .withArgs(streamer.address, streamer.address, 1, 2, ethers.parseEther("0.002"));

    await expect(gift.connect(user).redeemToToken(1, 1, user.address))
      .to.emit(gift, "RedeemedToToken")
      .withArgs(user.address, user.address, 1, 1);

    await expect(gift.connect(user).redeemToCredit(1, 1))
      .to.emit(gift, "RedeemedToCredit")
      .withArgs(user.address, 1, 1);

    expect(await gift.balanceOf(user.address, 1)).to.equal(0);
    expect(await gift.creditsOf(user.address, 1)).to.equal(3);
  });
});
