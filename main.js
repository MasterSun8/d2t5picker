const directive = [30, 25, 20, 10, 5]
const stats = ["health", "melee", "grenade", "class", "super", "weapons"]
const Mods = [5, 0]

const table = document.getElementById("results")

class Stats {
	constructor(health = 0, melee = 0, grenade = 0, classStat = 0, superStat = 0, weapons = 0) {
		this.health = health
		this.melee = melee
		this.grenade = grenade
		this.class = classStat
		this.super = superStat
		this.weapons = weapons
	}
	add(other) {
		return new Stats(
			this.health + other.health,
			this.melee + other.melee,
			this.grenade + other.grenade,
			this.class + other.class,
			this.super + other.super,
			this.weapons + other.weapons
		)
	}
	difference(other) {
		return new Stats(
			this.health - other.health,
			this.melee - other.melee,
			this.grenade - other.grenade,
			this.class - other.class,
			this.super - other.super,
			this.weapons - other.weapons
		)
	}
	enough(other) {
		return this.health >= other.health &&
			this.melee >= other.melee &&
			this.grenade >= other.grenade &&
			this.class >= other.class &&
			this.super >= other.super &&
			this.weapons >= other.weapons
	}
	count(array) {
		array.forEach(stat => {
			this[stat] += 1
		})
	}
	get possibleTertiary() {
		return stats.filter(stat => this[stat] == 0)
	}
}

class armorPiece {
	constructor(name, primary, secondary, tertiary = 0) {
		this.name = name
		this.stats = new Stats()
		this.stats[primary] = directive[0]
		this.stats[secondary] = directive[1]
		if (tertiary && tertiary != primary && tertiary != secondary) {
			this.stats[tertiary] = directive[2]
		}
	}
	get possibleTertiary() {
		return this.stats.possibleTertiary
	}
	set tertiary(tert) {
		this.stats[tert] = directive[2]
	}
}

const types = {
	GRENADIER: ["GRENADIER", "grenade", "super"],
	BULWARK: ["BULWARK", "health", "class"],
	SPECIALIST: ["SPECIALIST", "class", "weapons"],
	BRAWLER: ["BRAWLER", "melee", "health"],
	GUNNER: ["GUNNER", "weapons", "grenade"],
	PARAGON: ["PARAGON", "super", "melee"]
}

const emptyStat = new Stats()

function getSetHash(pieces) {
	const sortedPieces = [...pieces]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(piece => piece.name)
		.join('|');
	return sortedPieces;
}

function findCombinations(targetHealth, targetMelee, targetGrenade, targetClass, targetSuper, targetWeapons) {
	const targetStats = new Stats(targetHealth, targetMelee, targetGrenade, targetClass, targetSuper, targetWeapons)
	console.log("Finding combinations for:", targetStats)
	let minorMods = !!Mods[1]

	let modsFirst = false

	const results = []
	const seenCombinations = []
	const allArmorTypes = Object.values(types)

	allArmorTypes.forEach(headType => {
		allArmorTypes.forEach(armsType => {
			allArmorTypes.forEach(chestType => {
				allArmorTypes.forEach(legsType => {
					allArmorTypes.forEach(classType => {
						let modSpace = [...Mods]
						let mods = [[], []]
						let tertiary = []
						const pieces = [
							new armorPiece(...headType),
							new armorPiece(...armsType),
							new armorPiece(...chestType),
							new armorPiece(...legsType),
							new armorPiece(...classType)
						]

						let tertiaryOptions = pieces.map(piece => piece.possibleTertiary)
						let availableTertiaries = new Stats()
						availableTertiaries.count(tertiaryOptions.flat())

						let generatedStats = new Stats()

						pieces.forEach(piece => {
							generatedStats = generatedStats.add(piece.stats)
						})

						const hash = getSetHash(pieces)
						if (seenCombinations.includes(hash)) {
							return
						}
						seenCombinations.push(hash)
						if (targetStats.enough(generatedStats)) {
							results.push({ pieces: pieces, stats: generatedStats, mods: mods, tertiary: tertiary })
							return
						}

						let neededStats = targetStats.difference(generatedStats)
						let neededValues = Object.entries(neededStats)
							.filter(([key, value]) => value > 0)
							.map(([key, value]) => ({ stat: key, value }))
							.sort((a, b) => b.value - a.value)

						if (!modsFirst) {
							let t = 5
							neededValues.forEach(need => {
								// Try to assign tertiary to pieces that can actually accept this stat
								for (let piece of pieces) {
									if (t > 0 && need.value > 0 &&
										piece.possibleTertiary.includes(need.stat) &&
										!piece.stats[need.stat]) {

										need.value -= directive[2]
										generatedStats[need.stat] += directive[2]
										availableTertiaries[need.stat]--
										tertiary.push(need.stat)
										piece.tertiary = need.stat
										t--
									}
								}
							})
							if (neededValues.every(need => need.value <= 0)) {
								results.push({ pieces: pieces, stats: generatedStats, mods: mods, tertiary: tertiary })
								return
							}
						}
						neededValues.forEach((need, i) => {
							while (need.value > 0 && (modSpace[0] + modSpace[1]) > 0) {
								if (need.value <= 5) {
									need.value -= directive[4]
									generatedStats[need.stat] += directive[4]
									modSpace[1]--
									mods[1].push(need.stat)
								} else if (modSpace[0] > 0) {
									need.value -= directive[3]
									generatedStats[need.stat] += directive[3]
									modSpace[0]--
									mods[0].push(need.stat)
								} else {
									need.value -= directive[4]
									generatedStats[need.stat] += directive[4]
									modSpace[1]--
									mods[1].push(need.stat)
								}
							}
						})
						if (neededValues.every(need => need.value <= 0)) {
							results.push({ pieces: pieces, stats: generatedStats, mods: mods, tertiary: tertiary })
							return
						}

						if (modsFirst) {
							let t = 5
							neededValues.forEach(need => {
								while (need.value > 0 && availableTertiaries[need.stat] > 0 && t > 0) {
									need.value -= directive[2]
									generatedStats[need.stat] += directive[2]
									availableTertiaries[need.stat]--
									tertiary.push(need.stat)
									t--
								}
							})
							if (neededValues.every(need => need.value <= 0)) {
								results.push({ pieces: pieces, stats: generatedStats, mods: mods, tertiary: tertiary })
								return
							}
						}

					})
				})
			})
		})
	})

	return results
}

function listCombinations(targetHealth, targetMelee, targetGrenade, targetClass, targetSuper, targetWeapons) {
	const combinations = findCombinations(targetHealth, targetMelee, targetGrenade, targetClass, targetSuper, targetWeapons)

	console.log(`Found ${combinations.length} combinations`)
	let c = 1
	let i = 0
	combinations.forEach(combo => {
		if (combo.mods[0].length + combo.mods[1].length > 0) {
			return
		}

		c = -1

		let row = document.createElement("tr")
		let cell = document.createElement("td")

		cell.textContent = `${++i}`
		row.appendChild(cell)

		Object.entries(combo.stats).forEach(([stat, value]) => {
			cell = document.createElement("td")
			cell.textContent = `${value} (${combo.mods[0].filter(x => x == stat).length * directive[3] + (combo.mods[1].filter(x => x == stat).length * directive[4])})`
			row.appendChild(cell)
		})

		cell = document.createElement("td")
		cell.textContent = "None"
		row.appendChild(cell)

		table.appendChild(row)
	})
	if (c > 0) {
		combinations.forEach((combo, index) => {
			console.log(combo.pieces)

			let row = document.createElement("tr")
			let cell = document.createElement("td")

			cell.textContent = `${++index}`
			row.appendChild(cell)

			Object.entries(combo.stats).forEach(([stat, value]) => {
				cell = document.createElement("td")
				cell.textContent = `${value} (${combo.mods[0].filter(x => x == stat).length * directive[3] + (combo.mods[1].filter(x => x == stat).length * directive[4])})`
				row.appendChild(cell)
			})

			cell = document.createElement("td")
			if (combo.mods[0].length > 0) {
				cell.textContent = `Major: ${combo.mods[0]}\n`
			}
			if (combo.mods[1].length > 0) {
				cell.textContent += `Minor: ${combo.mods[1]}`
			}
			row.appendChild(cell)

			table.appendChild(row)
		})
	}
}

listCombinations(0, 0, 0, 80, 150, 0)