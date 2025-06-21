<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { createEventDispatcher, getContext, onMount } from 'svelte';

	import { flyAndScale } from '$lib/utils/transitions';
	import { goto } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';

	import { getUsage } from '$lib/apis';
	import { getActiveUsers } from '$lib/apis/users';
	import { userSignOut } from '$lib/apis/auths';

	import { showSettings, mobile, showSidebar, user } from '$lib/stores';

	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import ArchiveBox from '$lib/components/icons/ArchiveBox.svelte';
	import QuestionMarkCircle from '$lib/components/icons/QuestionMarkCircle.svelte';
	import Map from '$lib/components/icons/Map.svelte';
	import Keyboard from '$lib/components/icons/Keyboard.svelte';
	import ShortcutsModal from '$lib/components/chat/ShortcutsModal.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import Code from '$lib/components/icons/Code.svelte';
	import UserGroup from '$lib/components/icons/UserGroup.svelte';
	import SignOut from '$lib/components/icons/SignOut.svelte';

	const i18n = getContext('i18n');

	export let show = false;
	export let role = '';
	export let help = false;
	export let className = 'max-w-[240px]';

	let showShortcuts = false;

	const dispatch = createEventDispatcher();

	let usage = null;
	let activeUsers = [];
	
	const getUsageInfo = async () => {
		const res = await getUsage(localStorage.token).catch((error) => {
			console.error('Error fetching usage info:', error);
		});

		if (res) {
			usage = res;
		} else {
			usage = null;
		}
	};

	const getActiveUsersInfo = async () => {
		const res = await getActiveUsers(localStorage.token).catch((error) => {
			console.error('Error fetching active users info:', error);
		});

		if (res && res.users) {
			activeUsers = res.users;
		} else {
			activeUsers = [];
		}
	};

	$: if (show) {
		getUsageInfo();
		if (role === 'admin') {
			getActiveUsersInfo();
		} else {
			activeUsers = [];
		}
	}
</script>

<ShortcutsModal bind:show={showShortcuts} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<DropdownMenu.Root
	bind:open={show}
	onOpenChange={(state) => {
		dispatch('change', state);
	}}
>
	<DropdownMenu.Trigger>
		<slot />
	</DropdownMenu.Trigger>

	<slot name="content">
		<DropdownMenu.Content
			class="w-full {className} text-sm rounded-xl px-1 py-1.5 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-lg font-primary"
			sideOffset={4}
			side="bottom"
			align="start"
			transition={(e) => fade(e, { duration: 100 })}
		>
			<!-- User Role Display -->
			{#if role}
				<div class="flex items-center py-2 px-3 mb-1">
					<!-- User Icon -->
					<div class="mr-3">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-gray-600 dark:text-gray-400">
							<path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
						</svg>
					</div>
					<!-- Role Text -->
					<div class="text-sm">
						<span class="text-gray-600 dark:text-gray-400">Role:</span>
						<span class="ml-1 font-medium {role === 'admin' ? 'text-blue-600 dark:text-blue-400' : role === 'premium' ? 'text-orange-600 dark:text-orange-400' : role === 'user' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}">
							{$i18n.t(role.charAt(0).toUpperCase() + role.slice(1))}
						</span>
					</div>
				</div>
				<hr class="border-gray-100 dark:border-gray-800 my-1 p-0" />
			{/if}

			<button
				class="flex rounded-md py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition"
				on:click={async () => {
					await showSettings.set(true);
					show = false;

					if ($mobile) {
						showSidebar.set(false);
					}
				}}
			>
				<div class=" self-center mr-3">
					<Settings className="w-5 h-5" strokeWidth="1.5" />
				</div>
				<div class=" self-center truncate">{$i18n.t('Settings')}</div>
			</button>

			<button
				class="flex rounded-md py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition"
				on:click={() => {
					dispatch('show', 'archived-chat');
					show = false;

					if ($mobile) {
						showSidebar.set(false);
					}
				}}
			>
				<div class=" self-center mr-3">
					<ArchiveBox className="size-5" strokeWidth="1.5" />
				</div>
				<div class=" self-center truncate">{$i18n.t('Archived Chats')}</div>
			</button>

			{#if role === 'admin'}
				<button
					class="flex rounded-md py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition"
					on:click={() => {
						goto('/playground');
						show = false;

						if ($mobile) {
							showSidebar.set(false);
						}
					}}
				>
					<div class=" self-center mr-3">
						<Code className="size-5" strokeWidth="1.5" />
					</div>
					<div class=" self-center truncate">{$i18n.t('Playground')}</div>
				</button>

				<button
					class="flex rounded-md py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition"
					on:click={() => {
						goto('/admin');
						show = false;

						if ($mobile) {
							showSidebar.set(false);
						}
					}}
				>
					<div class=" self-center mr-3">
						<UserGroup className="w-5 h-5" strokeWidth="1.5" />
					</div>
					<div class=" self-center truncate">{$i18n.t('Admin Panel')}</div>
				</button>
			{/if}

			{#if help}
				<hr class=" border-gray-100 dark:border-gray-800 my-1 p-0" />

				{#if role === 'admin'}
				<!-- {$i18n.t('Help')} -->
				<DropdownMenu.Item
					class="flex gap-2 items-center py-1.5 px-3 text-sm select-none w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition"
					id="chat-share-button"
					on:click={() => {
						window.open('https://docs.openwebui.com', '_blank');
						show = false;
					}}
				>
					<QuestionMarkCircle className="size-5" />
					<div class="flex items-center">{$i18n.t('Documentation')}</div>
				</DropdownMenu.Item>

				<!-- Releases -->
				<DropdownMenu.Item
					class="flex gap-2 items-center py-1.5 px-3 text-sm select-none w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition"
					id="menu-item-releases"
					on:click={() => {
						window.open('https://github.com/open-webui/open-webui/releases', '_blank');
						show = false;
					}}
				>
					<Map className="size-5" />
					<div class="flex items-center">{$i18n.t('Releases')}</div>
				</DropdownMenu.Item>
				{/if}

				<DropdownMenu.Item
					class="flex gap-2 items-center py-1.5 px-3 text-sm select-none w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition"
					id="chat-share-button"
					on:click={() => {
						showShortcuts = !showShortcuts;
						show = false;
					}}
				>
					<Keyboard className="size-5" />
					<div class="flex items-center">{$i18n.t('Keyboard shortcuts')}</div>
				</DropdownMenu.Item>
			{/if}

			<hr class=" border-gray-100 dark:border-gray-800 my-1 p-0" />

			<button
				class="flex rounded-md py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition"
				on:click={async () => {
					const res = await userSignOut();
					user.set(null);
					localStorage.removeItem('token');

					location.href = res?.redirect_url ?? '/auth';
					show = false;
				}}
			>
				<div class=" self-center mr-3">
					<SignOut className="w-5 h-5" strokeWidth="1.5" />
				</div>
				<div class=" self-center truncate">{$i18n.t('Sign Out')}</div>
			</button>

			<!-- Active Users Display - Only for Admin -->
			{#if role === 'admin' && (activeUsers?.length > 0 || (usage?.user_ids?.length > 0))}
					<hr class=" border-gray-100 dark:border-gray-800 my-1 p-0" />

				<div class="py-2 px-3">
					<div class="flex items-center gap-2 mb-2">
						<div class="flex items-center">
								<span class="relative flex size-2">
									<span
										class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
									/>
									<span class="relative inline-flex rounded-full size-2 bg-green-500" />
								</span>
							</div>
						<span class="text-xs text-gray-600 dark:text-gray-400">
							{$i18n.t('Active Users')}: {activeUsers?.length || usage?.user_ids?.length || 0}
								</span>
					</div>

					{#if activeUsers?.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each activeUsers as activeUser}
								<div class="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1">
									<img
										src={activeUser.profile_image_url || '/user.png'}
										alt={activeUser.name}
										class="w-4 h-4 rounded-full object-cover"
										on:error={(e) => {
											e.currentTarget.src = '/user.png';
										}}
									/>
									<span class="text-xs font-medium truncate max-w-16" title={activeUser.name}>
										{activeUser.name}
								</span>
							</div>
							{/each}
						</div>
				{/if}
				</div>
			{/if}

			<!-- <DropdownMenu.Item class="flex items-center py-1.5 px-3 text-sm ">
				<div class="flex items-center">Profile</div>
			</DropdownMenu.Item> -->
		</DropdownMenu.Content>
	</slot>
</DropdownMenu.Root>
