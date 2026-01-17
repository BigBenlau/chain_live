import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import fs from "fs";
import path from "path";

// 部署高频打赏系统合约，并初始化礼物定价与启用状态。
const deployGiftCredits: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const configPath = path.join(__dirname, "../config/gift_deploy_config.json");
  const configRaw = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(configRaw) as {
    baseUri: string;
    giftCount: number;
    giftPrices: string[];
  };

  if (!config.baseUri) {
    throw new Error("baseUri is required in gift_deploy_config.json");
  }
  if (config.giftCount === undefined || config.giftCount === null) {
    throw new Error("giftCount is required in gift_deploy_config.json");
  }
  if (!config.giftPrices || !Array.isArray(config.giftPrices)) {
    throw new Error("giftPrices is required and must be an array in gift_deploy_config.json");
  }

  const baseUri = config.baseUri;
  const giftCount = Number(config.giftCount);
  const initialPrices = config.giftPrices.map(price => hre.ethers.parseEther(price));

  if (!giftCount || giftCount !== initialPrices.length) {
    throw new Error("giftCount must match giftPrices length in gift_deploy_config.json");
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
