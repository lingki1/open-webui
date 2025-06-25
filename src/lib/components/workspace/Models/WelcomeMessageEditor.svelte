<script lang="ts">
	import { getContext } from 'svelte';
	import { marked } from 'marked';
	import RichTextInput from '$lib/components/common/RichTextInput.svelte';
	
	const i18n = getContext('i18n');

	export let welcomeMessage = {
		enabled: false,
		content: '',
		image_url: null,
		show_once: true
	};

	let filesInputElement;
	let inputFiles;

	// 预览模式状态
	let showPreview = false;

	// 处理图片上传
	const handleImageUpload = () => {
		let reader = new FileReader();
		reader.onload = (event) => {
			let originalImageUrl = `${event.target.result}`;

			const img = new Image();
			img.src = originalImageUrl;

			img.onload = function () {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');

				// 计算图片宽高比
				const aspectRatio = img.width / img.height;

				// 计算适合400x300显示区域的新尺寸
				let newWidth, newHeight;
				if (aspectRatio > 4 / 3) {
					// 图片较宽，以宽度为准
					newWidth = 400;
					newHeight = 400 / aspectRatio;
				} else {
					// 图片较高，以高度为准
					newHeight = 300;
					newWidth = 300 * aspectRatio;
				}

				// 设置画布尺寸
				canvas.width = newWidth;
				canvas.height = newHeight;

				// 绘制图片
				ctx.drawImage(img, 0, 0, newWidth, newHeight);

				// 获取压缩后的base64
				const compressedSrc = canvas.toDataURL('image/jpeg', 0.8);

				welcomeMessage.image_url = compressedSrc;
				welcomeMessage = { ...welcomeMessage };

				inputFiles = null;
				filesInputElement.value = '';
			};
		};

		if (
			inputFiles &&
			inputFiles.length > 0 &&
			['image/gif', 'image/webp', 'image/jpeg', 'image/png', 'image/svg+xml'].includes(
				inputFiles[0]['type']
			)
		) {
			reader.readAsDataURL(inputFiles[0]);
		} else {
			console.log(`不支持的文件类型 '${inputFiles[0]['type']}'.`);
			inputFiles = null;
		}
	};

	// 处理富文本变化
	const handleContentChange = (data) => {
		if (data && typeof data.md !== 'undefined') {
			welcomeMessage.content = data.md || '';
			welcomeMessage = { ...welcomeMessage };
		}
	};

	// 重置图片
	const resetImage = () => {
		welcomeMessage.image_url = null;
		welcomeMessage = { ...welcomeMessage };
	};
</script>

<input
	bind:this={filesInputElement}
	bind:files={inputFiles}
	type="file"
	hidden
	accept="image/*"
	on:change={handleImageUpload}
/>

<div class="flex flex-col space-y-4">
	<!-- 开场白开关 -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<button 
				type="button"
				class="inline-flex items-center cursor-pointer"
				on:click={() => {
					welcomeMessage.enabled = !welcomeMessage.enabled;
					welcomeMessage = { ...welcomeMessage };
				}}
			>
				<div
					class="relative w-11 h-6 bg-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 rounded-full dark:bg-gray-700 {welcomeMessage.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'} transition-colors"
				>
					<div
						class="absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-all {welcomeMessage.enabled ? 'translate-x-full border-white' : ''}"
					></div>
				</div>
			</button>
			<div class="flex flex-col">
				<div class="text-sm font-medium">{$i18n.t('Welcome Message Feature')}</div>
				<div class="text-xs text-gray-500">{$i18n.t('Enable personalized welcome messages for this character model')}</div>
			</div>
		</div>

		{#if welcomeMessage.enabled}
			<button
				type="button"
				class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
				on:click={() => (showPreview = !showPreview)}
			>
				{showPreview ? $i18n.t('Edit') : $i18n.t('Preview')}
			</button>
		{/if}
	</div>

	{#if welcomeMessage.enabled}
		{#if !showPreview}
			<!-- 编辑模式 -->
			<div class="space-y-4">
				<!-- 开场白内容编辑器 -->
				<div>
					<label class="block text-sm font-medium mb-2">{$i18n.t('Welcome Message Content')}</label>
					<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
						<RichTextInput
							placeholder={$i18n.t('Enter welcome message content, supports Markdown format...')}
							bind:value={welcomeMessage.content}
							onChange={handleContentChange}
							className="welcome-message-editor p-3"
						/>
					</div>
					<div class="text-xs text-gray-500 mt-1">
						{$i18n.t('Supports Markdown format, you can use **bold**, *italic*, lists, etc.')}
					</div>
				</div>

				<!-- 图片设置 -->
				<div>
					<label class="block text-sm font-medium mb-2">{$i18n.t('Cover Image (Optional)')}</label>
					
					{#if welcomeMessage.image_url}
						<!-- 已有图片显示 -->
						<div class="flex flex-col space-y-2">
							<div class="relative inline-block">
								<img
									src={welcomeMessage.image_url}
									alt={$i18n.t('Welcome Message Cover')}
									class="max-w-full max-h-48 rounded-lg border border-gray-200 dark:border-gray-700"
								/>
								<button
									type="button"
									class="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
									on:click={resetImage}
									title={$i18n.t('Delete Image')}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
									</svg>
								</button>
							</div>
							<div class="flex space-x-2">
								<button
									type="button"
									class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
									on:click={() => filesInputElement.click()}
								>
									{$i18n.t('Change Image')}
								</button>
								<button
									type="button"
									class="px-3 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
									on:click={resetImage}
								>
									{$i18n.t('Delete Image')}
								</button>
							</div>
						</div>
					{:else}
						<!-- 上传图片按钮 -->
						<div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
							<div class="text-center">
								<svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
									<path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
								<div class="mt-2">
									<button
										type="button"
										class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
										on:click={() => filesInputElement.click()}
									>
										{$i18n.t('Select Image')}
									</button>
								</div>
								<p class="mt-1 text-xs text-gray-500">
									{$i18n.t('Supports PNG, JPG, GIF formats, recommended size 400x300')}
								</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- 显示选项 -->
				<div>
					<label class="block text-sm font-medium mb-2">{$i18n.t('Display Settings')}</label>
					<label class="inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={welcomeMessage.show_once}
							class="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
						/>
						<span class="ml-2 text-sm">{$i18n.t('Show only once per conversation')}</span>
					</label>
					<div class="text-xs text-gray-500 mt-1">
						{$i18n.t('When disabled, welcome message will show every time you switch to this character')}
					</div>
				</div>
			</div>
		{:else}
			<!-- 预览模式 -->
			<div class="space-y-4">
				<div class="text-sm font-medium">{$i18n.t('Preview Effect')}</div>
				<div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
					{#if welcomeMessage.image_url}
						<div class="mb-4">
							<img
								src={welcomeMessage.image_url}
								alt={$i18n.t('Welcome Message Cover')}
								class="max-w-full max-h-48 rounded-lg"
							/>
						</div>
					{/if}
					{#if welcomeMessage.content}
						<div class="prose prose-sm dark:prose-invert max-w-none">
							{@html marked.parse(welcomeMessage.content)}
						</div>
					{:else}
						<div class="text-gray-500 italic">{$i18n.t('No welcome message content')}</div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	:global(.welcome-message-editor) {
		font-size: 0.875rem;
	}
	
	:global(.welcome-message-editor .ProseMirror) {
		outline: none;
		min-height: 8rem;
	}
	
	:global(.welcome-message-editor .ProseMirror p) {
		margin: 0.5rem 0;
	}
	
	:global(.welcome-message-editor .ProseMirror h1, .welcome-message-editor .ProseMirror h2, .welcome-message-editor .ProseMirror h3) {
		font-weight: 600;
		margin: 0.5rem 0;
	}
	
	:global(.welcome-message-editor .ProseMirror ul, .welcome-message-editor .ProseMirror ol) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}
	
	:global(.welcome-message-editor .ProseMirror blockquote) {
		border-left: 4px solid #d1d5db;
		padding-left: 1rem;
		font-style: italic;
		margin: 0.5rem 0;
	}
</style> 