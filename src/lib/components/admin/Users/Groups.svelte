<script>
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';

	import { WEBUI_NAME, config, user, showSidebar, knowledge } from '$lib/stores';
	import { WEBUI_BASE_URL } from '$lib/constants';

	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import UsersSolid from '$lib/components/icons/UsersSolid.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import EllipsisHorizontal from '$lib/components/icons/EllipsisHorizontal.svelte';
	import User from '$lib/components/icons/User.svelte';
	import UserCircleSolid from '$lib/components/icons/UserCircleSolid.svelte';
	import GroupModal from './Groups/EditGroupModal.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import GroupItem from './Groups/GroupItem.svelte';
	import AddGroupModal from './Groups/AddGroupModal.svelte';
	import { createNewGroup, getGroups } from '$lib/apis/groups';
	import {
		getUserDefaultPermissions,
		getAllUsers,
		updateUserDefaultPermissions,
		getRoleDefaultPermissions,
		updateRoleDefaultPermissions
	} from '$lib/apis/users';

	const i18n = getContext('i18n');

	let loaded = false;

	let users = [];
	let total = 0;

	let groups = [];
	let filteredGroups;

	$: filteredGroups = groups.filter((user) => {
		if (search === '') {
			return true;
		} else {
			let name = user.name.toLowerCase();
			const query = search.toLowerCase();
			return name.includes(query);
		}
	});

	let search = '';
	let userDefaultPermissions = {
		workspace: {
			models: false,
			knowledge: false,
			prompts: false,
			tools: false
		},
		sharing: {
			public_models: false,
			public_knowledge: false,
			public_prompts: false,
			public_tools: false
		},
		chat: {
			controls: true,
			system_prompt: true,
			file_upload: true,
			delete: true,
			edit: true,
			share: true,
			export: true,
			stt: true,
			tts: true,
			call: true,
			multiple_models: true,
			temporary: true,
			temporary_enforced: false
		},
		features: {
			direct_tool_servers: false,
			web_search: true,
			image_generation: true,
			code_interpreter: true,
			notes: true
		}
	};

	let premiumDefaultPermissions = {
		workspace: {
			models: false,
			knowledge: false,
			prompts: false,
			tools: false
		},
		sharing: {
			public_models: false,
			public_knowledge: false,
			public_prompts: false,
			public_tools: false
		},
		chat: {
			controls: true,
			system_prompt: true,
			file_upload: true,
			delete: true,
			edit: true,
			share: true,
			export: true,
			stt: true,
			tts: true,
			call: true,
			multiple_models: true,
			temporary: true,
			temporary_enforced: false
		},
		features: {
			direct_tool_servers: false,
			web_search: true,
			image_generation: true,
			code_interpreter: true,
			notes: true
		}
	};

	let showCreateGroupModal = false;
	let showUserPermissionsModal = false;
	let showPremiumPermissionsModal = false;

	const setGroups = async () => {
		groups = await getGroups(localStorage.token);
	};

	const addGroupHandler = async (group) => {
		const res = await createNewGroup(localStorage.token, group).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			toast.success($i18n.t('Group created successfully'));
			groups = await getGroups(localStorage.token);
		}
	};

	const updateDefaultPermissionsHandler = async (group) => {
		console.debug(group.permissions);

		const res = await updateUserDefaultPermissions(localStorage.token, group.permissions).catch(
			(error) => {
				toast.error(`${error}`);
				return null;
			}
		);

		if (res) {
			toast.success($i18n.t('Default permissions updated successfully'));
			userDefaultPermissions = await getUserDefaultPermissions(localStorage.token);
		}
	};

	const updateUserPermissionsHandler = async (group) => {
		console.debug('Updating user permissions:', group.permissions);

		const res = await updateRoleDefaultPermissions(localStorage.token, 'user', group.permissions).catch(
			(error) => {
				toast.error(`${error}`);
				return null;
			}
		);

		if (res) {
			toast.success($i18n.t('User default permissions updated successfully'));
			await loadRolePermissions();
		}
	};

	const updatePremiumPermissionsHandler = async (group) => {
		console.debug('Updating premium permissions:', group.permissions);

		const res = await updateRoleDefaultPermissions(localStorage.token, 'premium', group.permissions).catch(
			(error) => {
				toast.error(`${error}`);
				return null;
			}
		);

		if (res) {
			toast.success($i18n.t('Premium default permissions updated successfully'));
			await loadRolePermissions();
		}
	};

	const loadRolePermissions = async () => {
		// Load user permissions
		const userPerms = await getRoleDefaultPermissions(localStorage.token, 'user').catch(
			(error) => {
				console.error('Error loading user permissions:', error);
				return null;
			}
		);
		if (userPerms) {
			userDefaultPermissions = userPerms;
		}

		// Load premium permissions
		const premiumPerms = await getRoleDefaultPermissions(localStorage.token, 'premium').catch(
			(error) => {
				console.error('Error loading premium permissions:', error);
				return null;
			}
		);
		if (premiumPerms) {
			premiumDefaultPermissions = premiumPerms;
		}
	};

	onMount(async () => {
		if ($user?.role !== 'admin') {
			await goto('/');
			return;
		}

		const res = await getAllUsers(localStorage.token).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			users = res.users;
			total = res.total;
		}

		await setGroups();
		
		// Load role-based permissions instead of general default permissions
		await loadRolePermissions();

		loaded = true;
	});
</script>

{#if loaded}
	<AddGroupModal bind:show={showCreateGroupModal} onSubmit={addGroupHandler} />
	<div class="mt-0.5 mb-2 gap-1 flex flex-col md:flex-row justify-between">
		<div class="flex md:self-center text-lg font-medium px-0.5">
			{$i18n.t('Groups')}
			<div class="flex self-center w-[1px] h-6 mx-2.5 bg-gray-50 dark:bg-gray-850" />

			<span class="text-lg font-medium text-gray-500 dark:text-gray-300">{groups.length}</span>
		</div>

		<div class="flex gap-1">
			<div class=" flex w-full space-x-2">
				<div class="flex flex-1">
					<div class=" self-center ml-1 mr-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="w-4 h-4"
						>
							<path
								fill-rule="evenodd"
								d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<input
						class=" w-full text-sm pr-4 py-1 rounded-r-xl outline-hidden bg-transparent"
						bind:value={search}
						placeholder={$i18n.t('Search')}
					/>
				</div>

				<div>
					<Tooltip content={$i18n.t('Create Group')}>
						<button
							class=" p-2 rounded-xl hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-850 transition font-medium text-sm flex items-center space-x-1"
							on:click={() => {
								showCreateGroupModal = !showCreateGroupModal;
							}}
						>
							<Plus className="size-3.5" />
						</button>
					</Tooltip>
				</div>
			</div>
		</div>
	</div>

	<div>
		{#if filteredGroups.length === 0}
			<div class="flex flex-col items-center justify-center h-40">
				<div class=" text-xl font-medium">
					{$i18n.t('Organize your users')}
				</div>

				<div class="mt-1 text-sm dark:text-gray-300">
					{$i18n.t('Use groups to group your users and assign permissions.')}
				</div>

				<div class="mt-3">
					<button
						class=" px-4 py-1.5 text-sm rounded-full bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition font-medium flex items-center space-x-1"
						aria-label={$i18n.t('Create Group')}
						on:click={() => {
							showCreateGroupModal = true;
						}}
					>
						{$i18n.t('Create Group')}
					</button>
				</div>
			</div>
		{:else}
			<div>
				<div class=" flex items-center gap-3 justify-between text-xs uppercase px-1 font-bold">
					<div class="w-full">Group</div>

					<div class="w-full">Users</div>

					<div class="w-full"></div>
				</div>

				<hr class="mt-1.5 border-gray-100 dark:border-gray-850" />

				{#each filteredGroups as group}
					<div class="my-2">
						<GroupItem {group} {users} {setGroups} />
					</div>
				{/each}
			</div>
		{/if}

		<hr class="mb-2 border-gray-100 dark:border-gray-850" />

		<!-- User Default Permissions Modal -->
		<GroupModal
			bind:show={showUserPermissionsModal}
			tabs={['permissions']}
			bind:permissions={userDefaultPermissions}
			custom={false}
			onSubmit={updateUserPermissionsHandler}
		/>

		<!-- Premium Default Permissions Modal -->
		<GroupModal
			bind:show={showPremiumPermissionsModal}
			tabs={['permissions']}
			bind:permissions={premiumDefaultPermissions}
			custom={false}
			onSubmit={updatePremiumPermissionsHandler}
		/>

		<!-- User Role Permissions Button -->
		<button
			class="flex items-center justify-between rounded-lg w-full transition pt-1 mb-2"
			on:click={() => {
				showUserPermissionsModal = true;
			}}
		>
			<div class="flex items-center gap-2.5">
				<div class="p-1.5 bg-green-500/10 dark:bg-green-500/20 rounded-full">
					<UsersSolid className="size-4 text-green-600 dark:text-green-400" />
				</div>

				<div class="text-left">
					<div class=" text-sm font-medium">{$i18n.t('User role permissions')}</div>

					<div class="flex text-xs mt-0.5 text-gray-600 dark:text-gray-400">
						{$i18n.t('Default permissions for users with "user" role')}
					</div>
				</div>
			</div>

			<div>
				<ChevronRight strokeWidth="2.5" />
			</div>
		</button>

		<!-- Premium Role Permissions Button -->
		<button
			class="flex items-center justify-between rounded-lg w-full transition pt-1"
			on:click={() => {
				showPremiumPermissionsModal = true;
			}}
		>
			<div class="flex items-center gap-2.5">
				<div class="p-1.5 bg-orange-500/10 dark:bg-orange-500/20 rounded-full">
					<UsersSolid className="size-4 text-orange-600 dark:text-orange-400" />
				</div>

				<div class="text-left">
					<div class=" text-sm font-medium">{$i18n.t('Premium role permissions')}</div>

					<div class="flex text-xs mt-0.5 text-gray-600 dark:text-gray-400">
						{$i18n.t('Default permissions for users with "premium" role')}
					</div>
				</div>
			</div>

			<div>
				<ChevronRight strokeWidth="2.5" />
			</div>
		</button>
	</div>
{/if}
