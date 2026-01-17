// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 本合约为高频打赏系统的链上核心：使用 credits/earnings 记账，高频 tip 只改账不转币，
// 仅在提现或兑换时铸造/销毁 ERC1155 礼物代币（礼物 id 从 1 开始，数量可配置）。

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

contract GiftCredits1155 is ERC1155, ERC1155Supply, AccessControl, Pausable, ReentrancyGuard {
    // 暂停相关操作的管理员角色
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    // 修改资金归集地址的管理员角色
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    // 主播身份角色
    bytes32 public constant STREAMER_ROLE = keccak256("STREAMER_ROLE");

    // 礼物类型数量（id 从 1 开始）
    uint256 public giftCount;

    // 礼物购买配置
    struct GiftConfig {
        uint256 priceNative; // 原生币单价
        bool enabled; // 是否启用该礼物
    }

    // 资金归集地址
    address public treasury;
    // 用户 credits 余额（用户 => 礼物类型 => 余额）
    mapping(address => mapping(uint256 => uint256)) public credits;
    // 主播 earnings 余额（主播 => 礼物类型 => 余额）
    mapping(address => mapping(uint256 => uint256)) public earnings;
    // 礼物配置（礼物类型 => 配置）
    mapping(uint256 => GiftConfig) public giftConfig;

    // 用户购买礼物 credits 事件
    event GiftPurchased(address indexed buyer, uint256 indexed giftId, uint256 amount, uint256 payAmount);
    // 用户打赏主播事件
    event Tipped(
        address indexed streamer,
        address indexed from,
        uint256 indexed giftId,
        uint256 amount,
        uint256 clientNonce
    );
    // 主播收益兑付为原生币事件
    event Withdrawn(
        address indexed streamer,
        address indexed to,
        uint256 indexed giftId,
        uint256 amount,
        uint256 payAmount
    );
    // credits 兑换 ERC1155 事件
    event RedeemedToToken(address indexed user, address indexed to, uint256 indexed giftId, uint256 amount);
    // ERC1155 兑换 credits 事件
    event RedeemedToCredit(address indexed user, uint256 indexed giftId, uint256 amount);
    // 礼物配置变更事件
    event GiftConfigUpdated(uint256 indexed giftId, uint256 priceNative, bool enabled);
    // 资金归集地址变更事件
    event TreasuryUpdated(address indexed treasury);
    // 管理员将合约内原生币转出事件
    event TreasuryTransferred(address indexed to, uint256 amount);
    // 用户将自己的 credits 转给其他用户事件
    event CreditsTransferred(address indexed from, address indexed to, uint256 indexed giftId, uint256 amount);

    // 仅限管理员操作
    // 初始化合约的基础 URI、管理员与初始礼物配置
    constructor(
        string memory baseUri,
        address admin,
        uint256 initialGiftCount,
        uint256[] memory initialPrices
    ) ERC1155(baseUri) {
        require(admin != address(0), "invalid admin");
        require(initialGiftCount > 0, "invalid gift count");
        require(initialPrices.length == initialGiftCount, "price length mismatch");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(TREASURY_ROLE, admin);
        treasury = address(this);
        giftCount = initialGiftCount;

        for (uint256 i = 0; i < initialGiftCount; i++) {
            _setGiftConfig(i + 1, initialPrices[i], true);
        }
    }

    // ===== 管理员功能（角色：DEFAULT_ADMIN_ROLE / TREASURY_ROLE / PAUSER_ROLE） =====

    // 管理员添加主播地址（DEFAULT_ADMIN_ROLE）
    function addStreamer(address streamer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(streamer != address(0), "invalid streamer");
        _grantRole(STREAMER_ROLE, streamer);
    }

    // 管理员移除主播地址（DEFAULT_ADMIN_ROLE）
    // 移除前要求该地址所有礼物收益为 0，避免丢失可兑付余额
    function removeStreamer(address streamer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(streamer != address(0), "invalid streamer");
        for (uint256 i = 1; i <= giftCount; i++) {
            require(earnings[streamer][i] == 0, "earnings not cleared");
        }
        _revokeRole(STREAMER_ROLE, streamer);
    }

    // 管理员将合约内原生币转出（DEFAULT_ADMIN_ROLE）
    function transferTreasury(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "invalid to");
        require(amount > 0, "invalid amount");
        (bool ok, ) = to.call{ value: amount }("");
        require(ok, "treasury transfer failed");
        emit TreasuryTransferred(to, amount);
    }

    // 配置礼物价格与启用状态（DEFAULT_ADMIN_ROLE）
    function setGiftConfig(uint256 giftId, uint256 priceNative, bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setGiftConfig(giftId, priceNative, enabled);
    }

    // ===== 用户功能（普通用户，无角色限制） =====

    // 使用原生币购买 credits（用户自行操作）
    function buyWithNative(uint256 giftId, uint256 amount) external payable whenNotPaused nonReentrant {
        require(_isSupportedGift(giftId), "unsupported gift");
        require(amount > 0, "invalid amount");
        GiftConfig memory config = giftConfig[giftId];
        require(config.enabled, "gift disabled");
        uint256 payAmount = config.priceNative * amount;
        require(msg.value == payAmount, "invalid value");

        credits[msg.sender][giftId] += amount;
        emit GiftPurchased(msg.sender, giftId, amount, payAmount);
    }

    // 进行高频打赏，仅在账本内转移 credits -> earnings（用户自行操作）
    function tip(
        address streamer,
        uint256 giftId,
        uint256 amount,
        uint256 clientNonce
    ) external whenNotPaused nonReentrant {
        require(streamer != address(0), "invalid streamer");
        require(hasRole(STREAMER_ROLE, streamer), "streamer not allowed");
        require(_isSupportedGift(giftId), "unsupported gift");
        require(amount > 0, "invalid amount");
        uint256 balance = credits[msg.sender][giftId];
        require(balance >= amount, "insufficient credits");

        credits[msg.sender][giftId] = balance - amount;
        earnings[streamer][giftId] += amount;
        emit Tipped(streamer, msg.sender, giftId, amount, clientNonce);
    }

    // 用户将自己的 credits 转给其他用户
    function transferCredits(address to, uint256 giftId, uint256 amount) external whenNotPaused nonReentrant {
        require(to != address(0), "invalid to");
        require(_isSupportedGift(giftId), "unsupported gift");
        require(amount > 0, "invalid amount");
        uint256 balance = credits[msg.sender][giftId];
        require(balance >= amount, "insufficient credits");

        credits[msg.sender][giftId] = balance - amount;
        credits[to][giftId] += amount;
        emit CreditsTransferred(msg.sender, to, giftId, amount);
    }

    // 用户将 credits 兑换为 ERC1155 礼物（仅允许兑换到本人地址）
    function redeemToToken(uint256 giftId, uint256 amount, address to) external whenNotPaused nonReentrant {
        require(to != address(0), "invalid to");
        require(to == msg.sender, "to must be sender");
        require(_isSupportedGift(giftId), "unsupported gift");
        require(amount > 0, "invalid amount");
        uint256 balance = credits[msg.sender][giftId];
        require(balance >= amount, "insufficient credits");

        credits[msg.sender][giftId] = balance - amount;
        _mint(to, giftId, amount, "");
        emit RedeemedToToken(msg.sender, to, giftId, amount);
    }

    // 用户将 ERC1155 礼物兑换回 credits
    function redeemToCredit(uint256 giftId, uint256 amount) external whenNotPaused nonReentrant {
        require(_isSupportedGift(giftId), "unsupported gift");
        require(amount > 0, "invalid amount");

        _burn(msg.sender, giftId, amount);
        credits[msg.sender][giftId] += amount;
        emit RedeemedToCredit(msg.sender, giftId, amount);
    }

    // ===== 资金方兑付功能（由资金归集方发起） =====

    // 资金方将主播 earnings 兑付为原生币
    function withdrawNative(
        address streamer,
        uint256 giftId,
        uint256 amount,
        address to
    ) external payable onlyRole(TREASURY_ROLE) whenNotPaused nonReentrant {
        require(to != address(0), "invalid to");
        require(to == streamer, "to must be streamer");
        require(hasRole(STREAMER_ROLE, streamer), "streamer not allowed");
        require(_isSupportedGift(giftId), "unsupported gift");
        require(amount > 0, "invalid amount");
        uint256 balance = earnings[streamer][giftId];
        require(balance >= amount, "insufficient earnings");

        GiftConfig memory config = giftConfig[giftId];
        uint256 payAmount = config.priceNative * amount;
        require(msg.value == payAmount, "invalid value");

        earnings[streamer][giftId] = balance - amount;
        (bool ok, ) = to.call{ value: payAmount }("");
        require(ok, "native transfer failed");
        emit Withdrawn(streamer, to, giftId, amount, payAmount);
    }

    // ===== 只读查询（任何人可读） =====

    // 查看用户 credits 余额
    function creditsOf(address user, uint256 giftId) external view returns (uint256) {
        return credits[user][giftId];
    }

    // 查看主播 earnings 余额
    function earningsOf(address streamer, uint256 giftId) external view returns (uint256) {
        return earnings[streamer][giftId];
    }

    // ===== 暂停控制（PAUSER_ROLE） =====

    // 暂停所有核心交易操作
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    // 恢复所有核心交易操作
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // 校验礼物类型是否在 [1, giftCount] 范围内
    function _isSupportedGift(uint256 giftId) internal view returns (bool) {
        return giftId >= 1 && giftId <= giftCount;
    }

    // 内部设置礼物配置
    function _setGiftConfig(uint256 giftId, uint256 priceNative, bool enabled) internal {
        require(giftId >= 1 && giftId <= giftCount, "unsupported gift");
        giftConfig[giftId] = GiftConfig({ priceNative: priceNative, enabled: enabled });
        emit GiftConfigUpdated(giftId, priceNative, enabled);
    }

    // 兼容 ERC1155Supply 的余额更新钩子
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    // 声明支持的接口
    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
