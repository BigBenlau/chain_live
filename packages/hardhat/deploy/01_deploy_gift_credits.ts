import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// 部署高频打赏系统合约，并初始化礼物定价与启用状态。
const deployGiftCredits: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const baseUri = process.env.GIFT_BASE_URI || "ipfs://gifts/{id}.json";
  const defaultPrices = ["0.001", "0.01", "0.05"].map(price => hre.ethers.parseEther(price));
  const giftCount = Number(process.env.GIFT_COUNT || defaultPrices.length);
  const priceList = (process.env.GIFT_PRICES || "")
    .split(",")
    .map(value => value.trim())
    .filter(value => value.length > 0)
    .map(value => hre.ethers.parseEther(value));
  const initialPrices = priceList.length > 0 ? priceList : defaultPrices;

  if (giftCount !== initialPrices.length) {
    throw new Error("GIFT_COUNT must match GIFT_PRICES length");
  }

  const gift = await deploy("GiftCredits1155", {
    from: deployer,
    args: [baseUri, deployer, giftCount, initialPrices],
    log: true,
    autoMine: true,
  });

  console.log("GiftCredits1155 deployed:", gift.address);
};

export default deployGiftCredits;
deployGiftCredits.tags = ["GiftCredits"];
