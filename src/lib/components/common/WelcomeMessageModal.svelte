<script lang="ts">
	import DOMPurify from 'dompurify';
	import { onMount, getContext, createEventDispatcher, onDestroy } from 'svelte';
	import * as FocusTrap from 'focus-trap';
	import { marked } from 'marked';
	import { fade } from 'svelte/transition';
	import { flyAndScale } from '$lib/utils/transitions';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let show = false;
	export let welcomeMessage = null;
	export let modelName = '';

	let modalElement = null;
	let mounted = false;
	let focusTrap: FocusTrap.FocusTrap | null = null;

	// 处理键盘事件
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			closeModal();
		}
		if (event.key === 'Enter' || event.key === ' ') {
			closeModal();
		}
	};

	// 关闭弹框
	const closeModal = () => {
		show = false;
		dispatch('close');
	};

	// 开始对话
	const startChat = () => {
		show = false;
		dispatch('startChat');
	};

	onMount(() => {
		mounted = true;
	});

	$: if (mounted) {
		if (show && modalElement) {
			document.body.appendChild(modalElement);
			focusTrap = FocusTrap.createFocusTrap(modalElement);
			focusTrap.activate();

			window.addEventListener('keydown', handleKeyDown);
			document.body.style.overflow = 'hidden';
		} else if (modalElement) {
			if (focusTrap) {
				focusTrap.deactivate();
			}

			window.removeEventListener('keydown', handleKeyDown);
			if (document.body.contains(modalElement)) {
				document.body.removeChild(modalElement);
			}

			document.body.style.overflow = 'unset';
		}
	}

	onDestroy(() => {
		show = false;
		if (focusTrap) {
			focusTrap.deactivate();
		}
		if (modalElement && document.body.contains(modalElement)) {
			document.body.removeChild(modalElement);
		}
		document.body.style.overflow = 'unset';
	});

	// 渲染Markdown内容
	$: renderedContent = welcomeMessage?.content 
		? DOMPurify.sanitize(marked.parse(welcomeMessage.content))
		: '';
</script>

{#if show && welcomeMessage}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		bind:this={modalElement}
		class="fixed top-0 right-0 left-0 bottom-0 bg-black/60 w-full h-screen max-h-[100dvh] flex justify-center z-[99999] overflow-hidden overscroll-contain"
		in:fade={{ duration: 10 }}
		on:mousedown={closeModal}
	>
		<div
			class="m-auto rounded-2xl max-w-full w-[36rem] mx-2 bg-white dark:bg-gray-950 max-h-[100dvh] shadow-3xl overflow-hidden"
			in:flyAndScale
			on:mousedown={(e) => {
				e.stopPropagation();
			}}
		>
			<!-- 头部 -->
			<div class="relative">
				{#if welcomeMessage.image_url}
					<div class="relative w-full h-48 overflow-hidden rounded-t-2xl">
											<img
						src={welcomeMessage.image_url}
						alt={$i18n.t('Character Cover')}
						class="w-full h-full object-cover"
					/>
						<div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
					</div>
				{/if}
				
				<!-- 关闭按钮 -->
				<button
					class="absolute top-4 right-4 p-2 rounded-full bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
					on:click={closeModal}
					type="button"
					title={$i18n.t('Close')}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>

			<!-- 内容区域 -->
			<div class="px-6 py-6 {welcomeMessage.image_url ? 'pt-4' : 'pt-6'}">
				<!-- 标题 -->
				<div class="text-center mb-4">
					<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
						{modelName ? $i18n.t("{{modelName}}'s Welcome Message", { modelName }) : $i18n.t("Character's Welcome Message")}
					</h2>
					<div class="w-16 h-1 bg-blue-500 rounded-full mx-auto"></div>
				</div>

				<!-- 开场白内容 -->
				<div class="mb-6 max-h-80 overflow-y-auto">
					{#if renderedContent}
						<div class="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
							{@html renderedContent}
						</div>
					{:else}
						<div class="text-center text-gray-500 dark:text-gray-400 italic">
							{$i18n.t('No welcome message content')}
						</div>
					{/if}
				</div>

				<!-- 操作按钮 -->
				<div class="flex flex-col sm:flex-row gap-3 justify-end">
					<button
						class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
						on:click={closeModal}
						type="button"
					>
						{$i18n.t('View Later')}
					</button>
					<button
						class="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg hover:shadow-xl"
						on:click={startChat}
						type="button"
					>
						{$i18n.t('Start Conversation')}
					</button>
				</div>
			</div>

			<!-- 装饰性渐变 -->
			<div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
		</div>
	</div>
{/if}

<style>
	/* 自定义滚动条样式 */
	.max-h-80::-webkit-scrollbar {
		width: 6px;
	}

	.max-h-80::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.1);
		border-radius: 3px;
	}

	.max-h-80::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 3px;
	}

	.max-h-80::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.5);
	}

	/* 暗黑模式滚动条 */
	:global(.dark) .max-h-80::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .max-h-80::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.3);
	}

	:global(.dark) .max-h-80::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	/* 优化prose样式 */
	:global(.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6) {
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	:global(.prose p) {
		margin-top: 0.75rem;
		margin-bottom: 0.75rem;
	}

	:global(.prose ul, .prose ol) {
		margin-top: 0.75rem;
		margin-bottom: 0.75rem;
		padding-left: 1.5rem;
	}

	:global(.prose blockquote) {
		margin-top: 1rem;
		margin-bottom: 1rem;
		padding-left: 1rem;
		border-left: 4px solid #3b82f6;
		font-style: italic;
	}

	:global(.prose code) {
		background-color: rgb(243 244 246);
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}

	:global(.dark .prose code) {
		background-color: rgb(31 41 55);
	}

	:global(.prose pre) {
		background-color: rgb(243 244 246);
		padding: 0.75rem;
		border-radius: 0.5rem;
		overflow-x: auto;
	}

	:global(.dark .prose pre) {
		background-color: rgb(31 41 55);
	}

	:global(.prose strong) {
		font-weight: 600;
	}

	:global(.prose em) {
		font-style: italic;
	}
</style> 