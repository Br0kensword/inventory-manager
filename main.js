const fs = require('fs/promises');

const loadFile = async fileName => {
	try {
		const data = await fs.readFile(fileName, 'utf-8')
		return JSON.parse(data) 
	} catch (e) {
		console.error(e);
	}
}

// Creates a mapping of subsidiaries to top level entities
const subsidiaryMapping = schema => {
	let mapping = {}
	if (schema) {
		Object.keys(schema).forEach( entity => {
			for (const sub of schema[entity].subsidiaries) {
				mapping[sub] = entity
			}
		}) 
	}
	return mapping
}

const getInventory = async (invPath, schemaPath) => {
	const inventory = await loadFile(invPath)
	const schema = await loadFile(schemaPath)
	const mapping = subsidiaryMapping(schema)
	let vendorHash = {}

	for (const vendor of inventory.filter( vendor => vendor.is_authorized )) {
		if (!vendorHash[vendor.name]) {
			// Check if vendor is a top level entity, if so check if subsidiaries exist and delete subs if they exist and have the same inventory_level
			const inventory_level = parseInt(vendor.inventory_level)
			if (schema[vendor.name]) {
				for (const sub in schema[vendor.name].subsidiaries) {
					if (vendorHash[sub] && vendorHash[sub] === vendor.inventory_level) {
						vendorHash.delete(sub)
					}
				}
				vendorHash[vendor.name] = inventory_level
			} else if (mapping[vendor.name]) { // Check if vendor is a subsidiary, if so dont add to vendorHash if its top level entity exists and has the same inventory_level
				if ( inventory_level !== vendorHash[mapping[vendor.name]]) {
					vendorHash[vendor.name] = inventory_level
				}
			} else { 
				vendorHash[vendor.name] = inventory_level
			}				
		} 
	}

	const inv = Object.values(vendorHash).reduce( (acc, value) => acc + value, 0)
	console.log(inv)
}

const arguments = process.argv.splice(2)

// Just some simple error handling to check if file is json
if (arguments[0].indexOf('.json') === -1 || arguments[1].indexOf('.json') === -1) {
	console.log('provided args must be json files')
} else {
	getInventory(arguments[0], arguments[1])
}
