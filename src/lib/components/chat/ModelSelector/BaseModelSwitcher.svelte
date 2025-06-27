<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { createEventDispatcher, getContext } from 'svelte';
	import { flyAndScale } from '$lib/utils/transitions';
	import { models, mobile } from '$lib/stores';
	import { WorkspaceModelManager } from '$lib/utils/models';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import Search from '$lib/components/icons/Search.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let workspaceModelId: string = '';
	export let selectedBaseModelId: string = '';
	export let placeholder = '选择基础模型';
	export let disabled = false;

	// 模仿原始样式的props
	export let className = 'w-[32rem]';
	export let triggerClassName = 'text-lg';

	let show = false;
	let searchValue = '';
	let selectedModelIdx = 0;

	// 获取所有可用的基础模型（排除工作空间模型）
	$: availableBaseModels = WorkspaceModelManager.getAvailableBaseModels();

	// 搜索过滤，模仿原始逻辑
	$: filteredModels = searchValue 
		? availableBaseModels.filter(model => 
			model.name.toLowerCase().includes(searchValue.toLowerCase()) ||
			model.id.toLowerCase().includes(searchValue.toLowerCase())
		)
		: availableBaseModels;

	// 获取当前选中的基础模型信息
	$: selectedBaseModel = availableBaseModels.find(model => model.id === selectedBaseModelId);

	const selectBaseModel = (modelId: string) => {
		selectedBaseModelId = modelId;
		dispatch('baseModelChanged', { 
			workspaceModelId, 
			baseModelId: modelId 
		});
		show = false;
	};

	// 键盘导航，模仿原始逻辑
	const handleKeydown = (e: KeyboardEvent) => {
		if (e.code === 'Enter' && filteredModels.length > 0) {
			selectBaseModel(filteredModels[selectedModelIdx].id);
			return;
		} else if (e.code === 'ArrowDown') {
			selectedModelIdx = Math.min(selectedModelIdx + 1, filteredModels.length - 1);
		} else if (e.code === 'ArrowUp') {
			selectedModelIdx = Math.max(selectedModelIdx - 1, 0);
		} else {
			selectedModelIdx = 0;
		}

		const item = document.querySelector(`[data-base-model-selected="true"]`);
		item?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
	};
</script>

<DropdownMenu.Root
	bind:open={show}
	onOpenChange={async () => {
		searchValue = '';
		selectedModelIdx = 0;
		window.setTimeout(() => document.getElementById('base-model-search-input')?.focus(), 0);
	}}
	closeFocus={false}
>
	<DropdownMenu.Trigger
		class="relative {$mobile ? 'w-full' : 'w-full'} font-primary"
		aria-label={placeholder}
		{disabled}
	>
		<button
			class="flex {$mobile ? 'w-full text-xs py-1 px-2' : 'w-full'} text-left px-0.5 outline-hidden bg-transparent truncate {triggerClassName} justify-between font-medium placeholder-gray-400 focus:outline-hidden {$mobile ? 'border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800' : ''} {disabled ? 'opacity-50 cursor-not-allowed' : ''}"
			type="button"
			{disabled}
		>
			<span class="truncate {$mobile ? 'flex-1' : ''}">
				{#if selectedBaseModel}
					{$mobile ? '基础模型: ' + selectedBaseModel.name : selectedBaseModel.name}
				{:else}
					{placeholder}
				{/if}
			</span>
			<ChevronDown className="self-center {$mobile ? 'ml-1' : 'ml-2'} size-3 flex-shrink-0" strokeWidth="2.5" />
		</button>
	</DropdownMenu.Trigger>

	<DropdownMenu.Content
		class="z-40 {$mobile ? 'w-[calc(100vw-2rem)] mx-4' : `${className}`} max-w-[calc(100vw-1rem)] justify-start rounded-xl bg-white dark:bg-gray-850 dark:text-white shadow-lg outline-hidden"
		transition={flyAndScale}
		side={$mobile ? 'bottom' : 'bottom'}
		align={$mobile ? 'center' : 'start'}
		sideOffset={3}
	>
		<!-- 搜索框，手机端优化 -->
		<div class="flex items-center gap-2.5 px-4 {$mobile ? 'mt-2 mb-1' : 'mt-3.5 mb-1.5'}">
			<Search className="size-4" strokeWidth="2.5" />
			<input
				id="base-model-search-input"
				bind:value={searchValue}
				class="w-full {$mobile ? 'text-xs' : 'text-sm'} bg-transparent outline-hidden"
				placeholder="搜索基础模型..."
				autocomplete="off"
				on:keydown={handleKeydown}
			/>
		</div>

		<!-- 模型列表，手机端优化 -->
		<div class="px-3 {$mobile ? 'max-h-48' : 'max-h-64'} overflow-y-auto group relative">
			{#each filteredModels as model, index}
				<button
					class="flex w-full font-medium line-clamp-1 select-none items-start rounded-button {$mobile ? 'py-1.5' : 'py-2'} pl-3 pr-1.5 {$mobile ? 'text-xs' : 'text-sm'} text-gray-700 dark:text-gray-100 outline-hidden transition-all duration-75 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer data-highlighted:bg-muted {selectedBaseModelId === model.id ? 'bg-gray-100 dark:bg-gray-800' : ''}"
					data-base-model-selected={selectedModelIdx === index}
					on:click={() => selectBaseModel(model.id)}
					on:mouseenter={!$mobile ? () => {
						selectedModelIdx = index;
					} : undefined}
				>
					<div class="flex-1 min-w-0 text-left">
						<div class="font-medium truncate text-left" title={model.name}>
							{model.name}
						</div>
						<div class="{$mobile ? 'text-[10px]' : 'text-xs'} text-gray-500 truncate text-left" title={model.id}>
							{model.id}
						</div>
					</div>
					{#if selectedBaseModelId === model.id}
						<div class="ml-2 text-blue-600 dark:text-blue-400 self-start {$mobile ? 'mt-0' : 'mt-0.5'}">
							<svg class="{$mobile ? 'size-3' : 'size-4'}" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
							</svg>
						</div>
					{/if}
				</button>
			{:else}
				<div class="block px-3 py-2 {$mobile ? 'text-xs' : 'text-sm'} text-gray-700 dark:text-gray-100">
					没有找到匹配的基础模型
				</div>
			{/each}
		</div>

		<!-- 底部提示，手机端减少间距 -->
		<div class="{$mobile ? 'mb-2' : 'mb-3'}"></div>

		<!-- 隐藏宽度类，模仿原始设计 -->
		<div class="hidden w-[42rem]" />
		<div class="hidden w-[32rem]" />
	</DropdownMenu.Content>
</DropdownMenu.Root> 