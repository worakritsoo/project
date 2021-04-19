<script>
	export let title;
	export let url;
	export let prefix = 'ชื่อย่อ';
	export let user;
	export let content = 'ยังไม่มีในส่วนของเนื้อหาแสดง';
	export let owner = 'ยังไม่มีในส่วนของเจ้าของเว็บ';
</script>

<div class="max-w-md mx-auto m-6 bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
	<div class="md:flex">
		<div class="md:flex-shrink-0">
			<img
				class="h-48 w-full object-cover md:w-48"
				src="https://dummyimage.com/240"
				alt="{prefix} logo "
			/>
		</div>
		<div class="p-8">
			<div class="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
				{title}
			</div>
			<a href={url} class="block mt-1 text-lg leading-tight font-medium text-black hover:underline"
				>{url}</a
			>
			<p class="mt-2 text-gray-500">
				อธิบายโดยย่อ: {content}
			</p>
			<p>ดูแลโดย: {owner}</p>
			<p class="hidden lg:w-4">{user}</p>
		</div>
	</div>
</div>
