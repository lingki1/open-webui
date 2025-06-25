import { get } from 'svelte/store';
import { chatModelLock, chatId } from '$lib/stores';
import { WorkspaceModelManager } from './models';

/**
 * 聊天模型锁定管理器
 * 负责管理对话与工作空间模型的锁定关系
 */
export class ChatModelLockManager {
	/**
	 * 将对话锁定到指定的工作空间模型
	 * @param chatIdValue 对话ID
	 * @param workspaceModelId 工作空间模型ID
	 */
	static lockChatToWorkspaceModel(chatIdValue: string, workspaceModelId: string): void {
		// 验证是否为工作空间模型
		if (!WorkspaceModelManager.isWorkspaceModel(workspaceModelId)) {
			console.warn(`尝试锁定到非工作空间模型: ${workspaceModelId}`);
			return;
		}

		// 验证模型是否可用
		if (!this.isModelAvailable(workspaceModelId)) {
			console.warn(`尝试锁定到不可用的模型: ${workspaceModelId}`);
			return;
		}

		// 设置锁定状态
		chatModelLock.set({
			isLocked: true,
			lockedWorkspaceModelId: workspaceModelId,
			lockedChatId: chatIdValue
		});

		console.log(`对话 ${chatIdValue} 已锁定到工作空间模型 ${workspaceModelId}`);
	}

	/**
	 * 解锁指定对话
	 * @param chatIdValue 对话ID
	 */
	static unlockChat(chatIdValue?: string): void {
		const currentLock = get(chatModelLock);
		
		// 如果指定了chatId，只解锁该对话
		if (chatIdValue && currentLock.lockedChatId !== chatIdValue) {
			return;
		}

		chatModelLock.set({
			isLocked: false,
			lockedWorkspaceModelId: null,
			lockedChatId: null
		});

		console.log(`对话 ${chatIdValue || currentLock.lockedChatId} 已解锁`);
	}

	/**
	 * 检查指定对话是否被锁定
	 * @param chatIdValue 对话ID
	 * @returns 是否被锁定
	 */
	static isChatLocked(chatIdValue: string): boolean {
		const currentLock = get(chatModelLock);
		return currentLock.isLocked && currentLock.lockedChatId === chatIdValue;
	}

	/**
	 * 检查当前对话是否被锁定
	 * @returns 是否被锁定
	 */
	static isCurrentChatLocked(): boolean {
		const currentChatId = get(chatId);
		return currentChatId ? this.isChatLocked(currentChatId) : false;
	}

	/**
	 * 获取对话锁定的工作空间模型ID
	 * @param chatIdValue 对话ID
	 * @returns 锁定的工作空间模型ID，如果未锁定则返回null
	 */
	static getLockedWorkspaceModelId(chatIdValue: string): string | null {
		const currentLock = get(chatModelLock);
		if (currentLock.isLocked && currentLock.lockedChatId === chatIdValue) {
			return currentLock.lockedWorkspaceModelId;
		}
		return null;
	}

	/**
	 * 检查是否可以在指定对话中选择某个模型
	 * @param chatIdValue 对话ID
	 * @param modelId 要选择的模型ID
	 * @returns 是否可以选择
	 */
	static canSelectModel(chatIdValue: string, modelId: string): boolean {
		// 如果对话未锁定，可以选择任何模型
		if (!this.isChatLocked(chatIdValue)) {
			return true;
		}

		// 如果对话已锁定，只能选择锁定的工作空间模型
		const lockedModelId = this.getLockedWorkspaceModelId(chatIdValue);
		return modelId === lockedModelId;
	}

	/**
	 * 检查是否可以在当前对话中选择某个模型
	 * @param modelId 要选择的模型ID
	 * @returns 是否可以选择
	 */
	static canSelectModelInCurrentChat(modelId: string): boolean {
		const currentChatId = get(chatId);
		return currentChatId ? this.canSelectModel(currentChatId, modelId) : true;
	}

	/**
	 * 获取当前锁定状态信息
	 * @returns 锁定状态对象
	 */
	static getCurrentLockState() {
		return get(chatModelLock);
	}

	/**
	 * 重置所有锁定状态（用于新对话）
	 */
	static resetAllLocks(): void {
		chatModelLock.set({
			isLocked: false,
			lockedWorkspaceModelId: null,
			lockedChatId: null
		});
		console.log('所有模型锁定状态已重置');
	}

	/**
	 * 检查模型是否可用
	 * @param modelId 模型ID
	 * @returns 是否可用
	 */
	private static isModelAvailable(modelId: string): boolean {
		// 这里可以添加更复杂的可用性检查逻辑
		// 比如检查模型是否在模型列表中，是否有权限等
		return WorkspaceModelManager.isWorkspaceModel(modelId);
	}

	/**
	 * 处理对话切换时的锁定状态
	 * @param newChatId 新的对话ID
	 * @param chatModels 对话中的模型列表
	 */
	static handleChatSwitch(newChatId: string, chatModels?: string[]): void {
		// 先重置当前锁定状态
		this.resetAllLocks();

		// 如果是新对话，保持解锁状态
		if (newChatId === 'new' || !chatModels || chatModels.length === 0) {
			return;
		}

		// 检查对话中是否有工作空间模型
		const workspaceModel = chatModels.find(modelId => 
			WorkspaceModelManager.isWorkspaceModel(modelId)
		);

		// 如果找到工作空间模型，恢复锁定状态
		if (workspaceModel) {
			this.lockChatToWorkspaceModel(newChatId, workspaceModel);
		}
	}

	/**
	 * 验证锁定状态的一致性
	 * @returns 是否一致
	 */
	static validateLockConsistency(): boolean {
		const currentLock = get(chatModelLock);
		const currentChatId = get(chatId);

		// 如果声称锁定但对话ID不匹配，说明状态不一致
		if (currentLock.isLocked && currentLock.lockedChatId !== currentChatId) {
			console.warn('锁定状态不一致，正在修复...');
			this.resetAllLocks();
			return false;
		}

		return true;
	}
} 