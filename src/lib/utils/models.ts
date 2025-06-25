import { get } from 'svelte/store';
import { models, dynamicBaseModels, settings, chatModelLock } from '$lib/stores';
import { updateUserSettings } from '$lib/apis/users';
import type { Model } from '$lib/stores';

/**
 * 工作空间模型识别和管理工具类
 */
export class WorkspaceModelManager {
	/**
	 * 检查模型是否为工作空间模型
	 * 工作空间模型的特征：
	 * 1. 具有 base_model_id 字段
	 * 2. 具有自定义的系统提示词或参数
	 */
	static isWorkspaceModel(modelId: string): boolean {
		const allModels = get(models);
		const model = allModels.find(m => m.id === modelId);
		
		if (!model?.info) return false;
		
		// 主要判断依据：有base_model_id字段表示这是基于其他模型创建的工作空间模型
		return !!(model.info.base_model_id);
	}

	/**
	 * 获取工作空间模型的原始基础模型ID
	 */
	static getOriginalBaseModelId(workspaceModelId: string): string | null {
		const allModels = get(models);
		const model = allModels.find(m => m.id === workspaceModelId);
		return model?.info?.base_model_id || null;
	}

	/**
	 * 获取工作空间模型当前使用的基础模型ID
	 * 优先返回动态设置的基础模型，如果没有则返回原始基础模型ID
	 */
	static getCurrentBaseModelId(workspaceModelId: string): string | null {
		const dynamicMapping = get(dynamicBaseModels);
		const dynamicBaseModelId = dynamicMapping[workspaceModelId];
		
		if (dynamicBaseModelId) {
			return dynamicBaseModelId;
		}
		
		return this.getOriginalBaseModelId(workspaceModelId);
	}

	/**
	 * 设置工作空间模型的动态基础模型
	 */
	static async setDynamicBaseModel(workspaceModelId: string, baseModelId: string): Promise<void> {
		// 如果设置的基础模型ID与原始基础模型ID相同，则移除动态映射
		const originalBaseModelId = this.getOriginalBaseModelId(workspaceModelId);
		
		dynamicBaseModels.update(mapping => {
			const newMapping = { ...mapping };
			
			if (baseModelId === originalBaseModelId) {
				// 删除动态映射，回到原始设置
				delete newMapping[workspaceModelId];
			} else {
				// 设置新的动态映射
				newMapping[workspaceModelId] = baseModelId;
			}
			
			return newMapping;
		});

		// 自动保存到用户设置
		await this.saveDynamicBaseModels();
	}

	/**
	 * 移除工作空间模型的动态基础模型设置
	 */
	static async removeDynamicBaseModel(workspaceModelId: string): Promise<void> {
		dynamicBaseModels.update(mapping => {
			const newMapping = { ...mapping };
			delete newMapping[workspaceModelId];
			return newMapping;
		});

		await this.saveDynamicBaseModels();
	}

	/**
	 * 获取所有可用的基础模型
	 * 排除工作空间模型、隐藏模型和arena模型
	 */
	static getAvailableBaseModels(): Model[] {
		const allModels = get(models);
		return allModels.filter(model => 
			!this.isWorkspaceModel(model.id) && // 不是工作空间模型
			!((model?.info?.meta as any)?.hidden ?? false) && // 不是隐藏模型
			(model as any).owned_by !== 'arena' // 不是arena模型
		);
	}

	/**
	 * 获取所有工作空间模型
	 */
	static getWorkspaceModels(): Model[] {
		const allModels = get(models);
		return allModels.filter(model => this.isWorkspaceModel(model.id));
	}

	/**
	 * 验证基础模型是否可用
	 */
	static isBaseModelAvailable(baseModelId: string): boolean {
		const availableModels = this.getAvailableBaseModels();
		return availableModels.some(model => model.id === baseModelId);
	}

	/**
	 * 获取工作空间模型的显示名称
	 * 格式：工作空间模型名 (基于 基础模型名)
	 */
	static getDisplayName(workspaceModelId: string): string {
		const allModels = get(models);
		const workspaceModel = allModels.find(m => m.id === workspaceModelId);
		
		if (!workspaceModel) return workspaceModelId;
		
		const currentBaseModelId = this.getCurrentBaseModelId(workspaceModelId);
		if (!currentBaseModelId) return workspaceModel.name;
		
		const baseModel = allModels.find(m => m.id === currentBaseModelId);
		const baseModelName = baseModel?.name || currentBaseModelId;
		
		return `${workspaceModel.name} (基于 ${baseModelName})`;
	}

	/**
	 * 保存动态基础模型映射到用户设置
	 */
	static async saveDynamicBaseModels(): Promise<void> {
		const currentDynamicModels = get(dynamicBaseModels);
		const currentSettings = get(settings);
		
		const updatedSettings = {
			...currentSettings,
			dynamicBaseModels: currentDynamicModels
		};
		
		settings.set(updatedSettings);
		
		try {
			await updateUserSettings(localStorage.token, { ui: updatedSettings });
			console.log('动态基础模型映射已保存到用户设置');
		} catch (error) {
			console.error('保存动态基础模型映射时出错:', error);
		}
	}

	/**
	 * 从用户设置加载动态基础模型映射
	 */
	static loadDynamicBaseModels(): void {
		const currentSettings = get(settings);
		const savedDynamicModels = currentSettings.dynamicBaseModels || {};
		
		dynamicBaseModels.set(savedDynamicModels);
		console.log('已从用户设置加载动态基础模型映射:', savedDynamicModels);
	}

	/**
	 * 清理无效的动态基础模型映射
	 * 删除不存在的工作空间模型或基础模型的映射
	 */
	static async cleanupInvalidMappings(): Promise<void> {
		const currentMapping = get(dynamicBaseModels);
		const workspaceModels = this.getWorkspaceModels();
		const availableBaseModels = this.getAvailableBaseModels();
		
		const workspaceModelIds = new Set(workspaceModels.map(m => m.id));
		const baseModelIds = new Set(availableBaseModels.map(m => m.id));
		
		const cleanedMapping: { [key: string]: string } = {};
		let hasChanges = false;
		
		for (const [workspaceId, baseId] of Object.entries(currentMapping)) {
			if (workspaceModelIds.has(workspaceId) && baseModelIds.has(baseId)) {
				cleanedMapping[workspaceId] = baseId;
			} else {
				hasChanges = true;
				console.log(`清理无效映射: ${workspaceId} -> ${baseId}`);
			}
		}
		
		if (hasChanges) {
			dynamicBaseModels.set(cleanedMapping);
			await this.saveDynamicBaseModels();
		}
	}

	/**
	 * 获取工作空间模型的统计信息
	 */
	static getWorkspaceModelStats(): {
		totalWorkspaceModels: number;
		modelsWithDynamicBase: number;
		availableBaseModels: number;
	} {
		const workspaceModels = this.getWorkspaceModels();
		const currentMapping = get(dynamicBaseModels);
		const availableBaseModels = this.getAvailableBaseModels();
		
		return {
			totalWorkspaceModels: workspaceModels.length,
			modelsWithDynamicBase: Object.keys(currentMapping).length,
			availableBaseModels: availableBaseModels.length
		};
	}

	/**
	 * 检查当前对话是否锁定到某个工作空间模型
	 * @param chatId 对话ID
	 * @returns 是否锁定
	 */
	static isChatLockedToWorkspaceModel(chatId: string): boolean {
		const lockState = get(chatModelLock);
		return lockState.isLocked && 
			   lockState.lockedChatId === chatId && 
			   !!lockState.lockedWorkspaceModelId && 
			   this.isWorkspaceModel(lockState.lockedWorkspaceModelId);
	}

	/**
	 * 获取对话锁定的工作空间模型
	 * @param chatId 对话ID
	 * @returns 锁定的工作空间模型对象，如果未锁定则返回null
	 */
	static getLockedWorkspaceModel(chatId: string): Model | null {
		const lockState = get(chatModelLock);
		if (!lockState.isLocked || lockState.lockedChatId !== chatId || !lockState.lockedWorkspaceModelId) {
			return null;
		}

		const allModels = get(models);
		return allModels.find(m => m.id === lockState.lockedWorkspaceModelId) || null;
	}

	/**
	 * 过滤可选择的模型（考虑锁定状态）
	 * @param chatId 对话ID
	 * @param allModels 所有模型列表
	 * @returns 可选择的模型列表
	 */
	static getSelectableModels(chatId: string, allModels?: Model[]): Model[] {
		const modelList = allModels || get(models);
		
		// 如果对话未锁定，返回所有非隐藏模型
		if (!this.isChatLockedToWorkspaceModel(chatId)) {
			return modelList.filter(model => 
				!((model?.info?.meta as any)?.hidden ?? false)
			);
		}

		// 如果对话已锁定，只返回锁定的工作空间模型
		const lockedModel = this.getLockedWorkspaceModel(chatId);
		return lockedModel ? [lockedModel] : [];
	}

	/**
	 * 检查是否可以在对话中选择指定模型
	 * @param chatId 对话ID
	 * @param modelId 要检查的模型ID
	 * @returns 是否可以选择
	 */
	static canSelectModelInChat(chatId: string, modelId: string): boolean {
		// 如果对话未锁定，可以选择任何非隐藏模型
		if (!this.isChatLockedToWorkspaceModel(chatId)) {
			const allModels = get(models);
			const model = allModels.find(m => m.id === modelId);
			return model ? !((model?.info?.meta as any)?.hidden ?? false) : false;
		}

		// 如果对话已锁定，只能选择锁定的工作空间模型
		const lockState = get(chatModelLock);
		return lockState.lockedWorkspaceModelId === modelId;
	}

	/**
	 * 获取工作空间模型锁定状态的显示信息
	 * @param chatId 对话ID
	 * @returns 锁定状态显示信息
	 */
	static getLockDisplayInfo(chatId: string): {
		isLocked: boolean;
		displayName: string | null;
		lockMessage: string | null;
	} {
		if (!this.isChatLockedToWorkspaceModel(chatId)) {
			return {
				isLocked: false,
				displayName: null,
				lockMessage: null
			};
		}

		const lockedModel = this.getLockedWorkspaceModel(chatId);
		if (!lockedModel) {
			return {
				isLocked: true,
				displayName: null,
				lockMessage: '锁定的模型不可用'
			};
		}

		return {
			isLocked: true,
			displayName: this.getDisplayName(lockedModel.id),
			lockMessage: `此对话已锁定到工作空间模型: ${lockedModel.name}`
		};
	}
} 