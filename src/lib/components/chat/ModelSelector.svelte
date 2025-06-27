<script lang="ts">
	import { models, showSettings, settings, user, mobile, config, dynamicBaseModels, chatModelLock, chatId } from '$lib/stores';
	import { onMount, tick, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Selector from './ModelSelector/Selector.svelte';
	import BaseModelSwitcher from './ModelSelector/BaseModelSwitcher.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import { WorkspaceModelManager } from '$lib/utils/models';
	import { ChatModelLockManager } from '$lib/utils/chat-model-lock';

	import { updateUserSettings } from '$lib/apis/users';
	const i18n = getContext('i18n');

	export let selectedModels = [''];
	export let disabled = false;

	export let showSetDefault = true;

	// 锁定状态相关变量
	$: currentChatId = $chatId;
	$: lockState = $chatModelLock;
	$: isCurrentChatLocked = currentChatId && ChatModelLockManager.isChatLocked(currentChatId);
	$: lockDisplayInfo = currentChatId ? WorkspaceModelManager.getLockDisplayInfo(currentChatId) : { isLocked: false, displayName: null, lockMessage: null };

	const saveDefaultModel = async () => {
		const hasEmptyModel = selectedModels.filter((it) => it === '');
		if (hasEmptyModel.length) {
			toast.error($i18n.t('Choose a model before saving...'));
			return;
		}
		settings.set({ ...$settings, models: selectedModels });
		await updateUserSettings(localStorage.token, { ui: $settings });

		toast.success($i18n.t('Default model updated'));
	};

	const pinModelHandler = async (modelId: string) => {
		let pinnedModels = $settings?.pinnedModels ?? [];

		if (pinnedModels.includes(modelId)) {
			pinnedModels = pinnedModels.filter((id) => id !== modelId);
		} else {
			pinnedModels = [...new Set([...pinnedModels, modelId])];
		}

		settings.set({ ...$settings, pinnedModels: pinnedModels });
		await updateUserSettings(localStorage.token, { ui: $settings });
	};

	$: if (selectedModels.length > 0 && $models.length > 0) {
		selectedModels = selectedModels.map((model) =>
			$models.map((m) => m.id).includes(model) ? model : ''
		);
	}

	// 监听模型选择变化，处理锁定逻辑
	$: if (selectedModels.length > 0 && selectedModels[0] && currentChatId) {
		handleModelSelection(selectedModels[0]);
	}

	const handleModelSelection = (modelId: string) => {
		// 如果选择了工作空间模型且当前对话未锁定
		if (WorkspaceModelManager.isWorkspaceModel(modelId) && 
			!isCurrentChatLocked && 
			currentChatId && 
			currentChatId !== 'new') {
			
			// 锁定当前对话到此工作空间模型
			ChatModelLockManager.lockChatToWorkspaceModel(currentChatId, modelId);
			
			console.log(`对话 ${currentChatId} 已锁定到工作空间模型 ${modelId}`);
			
			// 可选：显示成功提示
			// toast.success('对话已锁定到工作空间模型');
		}
	};

	// 获取可选择的模型列表（考虑锁定状态）
	$: selectableModels = currentChatId ? 
		WorkspaceModelManager.getSelectableModels(currentChatId, $models) : 
		$models.filter(model => !((model?.info?.meta as any)?.hidden ?? false));

	// 处理基础模型切换
	const handleBaseModelChange = async (event: CustomEvent) => {
		const { workspaceModelId, baseModelId } = event.detail;
		try {
			await WorkspaceModelManager.setDynamicBaseModel(workspaceModelId, baseModelId);
			console.log(`工作空间模型 ${workspaceModelId} 的基础模型已切换为 ${baseModelId}`);
			
			// 可选：显示成功提示
			// toast.success('基础模型切换成功');
		} catch (error) {
			console.error('切换基础模型时出错:', error);
			// toast.error('基础模型切换失败');
		}
	};

	// 组件挂载时加载动态基础模型映射
	onMount(() => {
		WorkspaceModelManager.loadDynamicBaseModels();
	});
</script>

<div class="flex flex-col w-full items-start">
	{#each selectedModels as selectedModel, selectedModelIdx}
		<div class="flex flex-col w-full max-w-fit">
			<div class="flex w-full max-w-fit items-center gap-2">
				<!-- 主要模型选择器 -->
				<div class="overflow-hidden flex-1 min-w-0">
					<div class="mr-1 max-w-full">
						<Selector
							id={`${selectedModelIdx}`}
							placeholder={isCurrentChatLocked && lockDisplayInfo.displayName ? lockDisplayInfo.displayName : $i18n.t('Select a model')}
							items={selectableModels.map((model) => ({
								value: model.id,
								label: model.name,
								model: model
							}))}
							disabled={isCurrentChatLocked || disabled}
							showTemporaryChatControl={$user?.role === 'user'
								? ($user?.permissions?.chat?.temporary ?? true) &&
									!($user?.permissions?.chat?.temporary_enforced ?? false)
								: true}
							{pinModelHandler}
							bind:value={selectedModel}
						/>
					</div>
				</div>

				<!-- 桌面端：工作空间模型基础模型切换器放在主选择器旁边 -->
				{#if selectedModel && WorkspaceModelManager.isWorkspaceModel(selectedModel) && !$mobile}
					<div class="flex-shrink-0">
						<BaseModelSwitcher
							workspaceModelId={selectedModel}
							selectedBaseModelId={WorkspaceModelManager.getCurrentBaseModelId(selectedModel) || ''}
							placeholder="选择基础模型"
							className="w-[24rem]"
							triggerClassName="text-sm"
							{disabled}
							on:baseModelChanged={handleBaseModelChange}
						/>
					</div>
				{/if}

				<!-- 添加/删除模型按钮 -->
				{#if $user?.role === 'admin' || ($user?.permissions?.chat?.multiple_models ?? true)}
					{#if selectedModelIdx === 0}
						<div
							class="self-center mx-1 disabled:text-gray-600 disabled:hover:text-gray-600 -translate-y-[0.5px]"
						>
							<Tooltip content={$i18n.t('Add Model')}>
								<button
									class=" "
									{disabled}
									on:click={() => {
										selectedModels = [...selectedModels, ''];
									}}
									aria-label="Add Model"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="2"
										stroke="currentColor"
										class="size-3.5"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
									</svg>
								</button>
							</Tooltip>
						</div>
					{:else}
						<div
							class="self-center mx-1 disabled:text-gray-600 disabled:hover:text-gray-600 -translate-y-[0.5px]"
						>
							<Tooltip content={$i18n.t('Remove Model')}>
								<button
									{disabled}
									on:click={() => {
										selectedModels.splice(selectedModelIdx, 1);
										selectedModels = selectedModels;
									}}
									aria-label="Remove Model"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="2"
										stroke="currentColor"
										class="size-3"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
									</svg>
								</button>
							</Tooltip>
						</div>
					{/if}
				{/if}
			</div>

			<!-- 手机端：工作空间模型基础模型切换器显示在下方 -->
			{#if selectedModel && WorkspaceModelManager.isWorkspaceModel(selectedModel) && $mobile}
				<div class="mt-2 w-full">
					<BaseModelSwitcher
						workspaceModelId={selectedModel}
						selectedBaseModelId={WorkspaceModelManager.getCurrentBaseModelId(selectedModel) || ''}
						placeholder="选择基础模型"
						className="w-full"
						triggerClassName="text-xs"
						{disabled}
						on:baseModelChanged={handleBaseModelChange}
					/>
				</div>
			{/if}
		</div>
	{/each}
</div>

{#if showSetDefault}
	<div
		class="absolute text-left mt-[1px] ml-1 text-[0.7rem] text-gray-600 dark:text-gray-400 font-primary"
	>
		<button on:click={saveDefaultModel}> {$i18n.t('Set as default')}</button>
	</div>
{/if}
