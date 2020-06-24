import { data_container, JoinTable, data, joins, Option, some, none } from "./data"

function DeepCheck<T>(left: T, right: T): boolean {
	if (typeof left == "object") {
		if (Array.isArray(left) && Array.isArray(right)) {
			return left.every(leftx => right.some(rightx => DeepCheck(leftx, rightx)))
		} else if (Array.isArray(left) && !Array.isArray(right)) {
			return false
		}
		return Object.keys(left).every(leftx => Object.keys(right).some(rightx => {
			return DeepCheck(left[leftx], right[rightx])
		}))
	} else {
		return left == right
	}
}



class Iterator2Lose<T> {
	value: () => Option<T>

	constructor(val: () => Option<T>) {
		this.value = val
	}

	next = () => this.value()

	map = <T2>(func: (_: T) => T2) =>
		new Iterator2Lose(() => {
			const obj = this.next()
			if (obj.kind == "some") {
				return some(func(obj.value))
			}
			return none()
		})

	filter = (func: (_: T) => boolean) =>
		new Iterator2Lose(() => {
			while (true) {
				const val = this.next()
				if (val.kind == "some" && func(val.value)) {
					return val
				}
			}
		})

	find = (func: (_: T) => boolean) => {
		while (true) {
			const obj = this.next()
			if (obj.kind == "none") {
				return none()
			}
			if (func(obj.value)) {
				return obj
			}
		}
	}

	orderBy(v: (left: T, right: T) => number): Iterator2Lose<T> {
		const outcome = this.toList().sort(v)
		let at = -1
		return new Iterator2Lose(() => {
			at++
			if (at >= outcome.length) {
				return none()
			}
			return some(outcome[at])
		})
	}

	groupBy<Z extends keyof T>(...x: Array<Z>): Map<Array<T[Z]>, Iterator2Lose<T>> {
		let map = new Map<Array<T[Z]>, Array<T>>()
		this.forEach(v => {
			let currentKey = x.map(b => v[b])
			for (const oldKey of map.keys()) {
				if (DeepCheck(currentKey, oldKey)) {
					currentKey = oldKey
				}
			}
			const key = currentKey
			const z = map.get(key)
			if (z) {
				z.push(v)
			} else {
				map.set(key, [v])
			}
		})
		let returnMap = new Map()
		map.forEach((v, key) => {
			let at = -1
			returnMap.set(key, new Iterator2Lose(() => {
				at++
				if (at >= v.length) {
					return none()
				}
				return some(v[at])
			}))
		})
		return returnMap
	}

	//inspect is apparently something special in JS :(
	insp = (func: (_: T) => void) =>
		new Iterator2Lose(() => {
			let obj = this.next()
			if (obj.kind == "none") {
				return none()
			}
			else {
				func(obj.value)
				return obj
			}
		})
	forEach = (func: (_: T) => void) => {
		while (true) {
			const next = this.next()
			if (next.kind === "some") {
				func(next.value)

			} else {
				break
			}
		}
	}
	toList = () => {
		let l: Array<T> = []
		this.forEach(v => l.push(v))
		return l
	}
	Select = <C2 extends keyof T>(
		...c: Array<C2>
	): Iterator2Lose<Pick<T, typeof c[number]>> => new Iterator2Lose(() => {
		//we need to do a bit of type butchering.
		//first, turn the raw value into what the user wanted to see BEFORE the call to .Select()
		//then, make a new object that will ONLY contain the Selected keys.
		//we start this as a partial because we need to add them slowly.
		//we convert it to a full one later.
		const raw_value = this.next()
		if (raw_value.kind == "none") {
			return raw_value
		}
		let return_value: Partial<Pick<T, C2>> = {}
		c.forEach(z => return_value = { ...return_value, [z]: raw_value.value[z] })
		return some(return_value as Pick<T, C2>)
	})
}

export class ListModel<
	TableName extends keyof data_container & keyof JoinTable, TableType extends data_container[TableName]
	> {
	private reference: Array<TableType>
	private at: number
	private name: TableName
	constructor(name: TableName) {
		this.reference = data[name] as [TableType]
		this.at = 0
		this.name = name
	}
	next = () => {
		if (this.at >= this.reference.length) {
			return none()
		}
		let val = this.reference[this.at]
		this.at += 1
		return some(val)
	}
	iterModel = () => new Iterator2(this.next, this.name, (v) => v)
}


export class Iterator2<
	//this limits the amount of keys that can be used to select data to ONLY
	//strings that are actually in the table
	TableKey extends keyof data_container & keyof JoinTable,

	//the type of the table that got selected
	TableType extends data_container[TableKey],

	//what we will return once we go back to a list
	OutcomeType = data_container[TableKey]
	> {
	//this is the internal function that advances the iterator
	private value: () => Option<TableType>
	//we need to keep track of which table we used as a base for the Include method
	private name: TableKey
	//this function transforms the raw data into what the user requested with .Select and/or .Map
	private convertToRequestedType: (v: TableType) => OutcomeType

	constructor(
		val: () => Option<TableType>,
		name: TableKey,
		display: (v: TableType) => OutcomeType,
	) {
		this.value = val
		this.name = name
		this.convertToRequestedType = display
	}
	Select<C2 extends keyof OutcomeType>(...selected_keys: C2[]): Iterator2<TableKey, TableType, Pick<OutcomeType, C2>> {
		return new Iterator2(
			this.value,
			this.name,
			raw_value => {
				//we need to do a bit of type butchering.
				//first, turn the raw value into what the user wanted to see BEFORE the call to .Select()
				//then, make a new object that will ONLY contain the Selected keys.
				//we start this as a partial because we need to add them slowly.
				//we convert it to a full one later.
				let p = this.convertToRequestedType(raw_value)
				let return_value: Partial<Pick<OutcomeType, C2>> = {}
				selected_keys.forEach(z => return_value = { ...return_value, [z]: p[z] })
				return return_value as Pick<OutcomeType, C2>
			}
		)
	}

	Map<X>(fun: (v: OutcomeType) => X): Iterator2<TableKey, TableType, X> {
		return new Iterator2(
			this.value,
			this.name,
			(v) => fun(this.convertToRequestedType(v)),
		)
	}

	groupBy<Z extends keyof OutcomeType>(...x: Array<Z>): Map<Array<OutcomeType[Z]>, Iterator2Lose<OutcomeType>> {
		let map = new Map<Array<OutcomeType[Z]>, Array<OutcomeType>>()
		this.forEach(v => {
			let currentKey = x.map(b => v[b])
			for (const oldKey of map.keys()) {
				if (DeepCheck(currentKey, oldKey)) {
					currentKey = oldKey
				}
			}
			const key = currentKey
			const z = map.get(key)
			if (z) {
				z.push(v)
			} else {
				map.set(key, [v])
			}
		})
		let returnMap = new Map()
		map.forEach((v, key) => {
			let at = -1
			returnMap.set(key, new Iterator2Lose(() => {
				at++
				if (at >= v.length) {
					return none()
				}
				return some(v[at])
			}))
		})
		return returnMap
	}

	flatmap<U>(v: (x: OutcomeType) => U | ReadonlyArray<U>): Iterator2Lose<U> {
		let z = this.toList()
		let y = z.flatMap(v)
		let at = -1
		return new Iterator2Lose(() => {
			at++
			if (at >= y.length) {
				return none()
			}
			return some(y[at])
		})

	}

	orderBy(v: (left: OutcomeType, right: OutcomeType) => number): Iterator2Lose<OutcomeType> {
		const outcome = this.toList().sort(v)
		let at = -1
		return new Iterator2Lose(() => {
			at++
			if (at >= outcome.length) {
				return none()
			}
			return some(outcome[at])
		})
	}

	Where(func: (_: TableType) => boolean) {
		return new Iterator2(
			() => {
				while (true) {
					const val = this.value()
					if (val.kind == "some") {
						if (func(val.value)) {
							return val
						}
					} else {
						return none()
					}
				}
			},
			this.name,
			this.convertToRequestedType,
		)
	}

	IncludeSingle<X extends keyof JoinTable[TableKey] & keyof data_container & keyof JoinTable, Y>(
		table_to_join: X,
		fun: (v: Iterator2<X, data_container[X], data_container[X]>) => Iterator2<X, data_container[X], Y> | Iterator2Lose<Y>
	): Iterator2<TableKey, TableType, { [_ in X]: Y } & OutcomeType> {
		const next = () => {
			const next = this.value()
			if (next.kind == "none") {
				return none()
			}
			const x = fun(
				new ListModel(table_to_join)
					.iterModel()
					.Where(p => {
						const keys = joins[this.name][table_to_join]
						if (next.kind == "some" && p && keys) {
							return next.value[keys["right"]] == p[keys["left"]]
						}
						return false

					})
			).next();
			if (x.kind == "none") {
				return none()
			}

			return some({
				[table_to_join]: x.value,
				...next.value
			})
		}
		return new Iterator2(
			next,
			this.name,
			(current) => {
				let basic = this.convertToRequestedType(current)
				let partial = { [table_to_join]: current[table_to_join], ...basic }
				let final = partial as OutcomeType & { [key in X] }
				return final
			}
		)
	}

	Include<X extends keyof JoinTable[TableKey] & keyof data_container & keyof JoinTable, Y>(
		table_to_join: X,
		fun: (v: Iterator2<X, data_container[X], data_container[X]>) => Iterator2<X, data_container[X], Y> | Iterator2Lose<Y>
	): Iterator2<TableKey, TableType, { [_ in X]: Y[] } & OutcomeType> {
		const next = () => {
			const next = this.value()
			if (next.kind == "none") {
				return none()
			}
			return some({
				[table_to_join]: fun(
					new ListModel(table_to_join)
						.iterModel()
						.Where(p => {
							const keys = joins[this.name][table_to_join]
							if (next.kind == "some" && p && keys) {
								return next.value[keys["right"]] == p[keys["left"]]
							}
							return false

						})
				).toList(),
				...next.value
			})
		}
		return new Iterator2(
			next,
			this.name,
			(current) => {
				let basic = this.convertToRequestedType(current)
				let partial = { [table_to_join]: current[table_to_join], ...basic }
				let final = partial as OutcomeType & { [key in X] }
				return final
			}
		)
	}

	//Does something with each element of an iterator, passing the value on.
	//When using iterators, you'll often chain several of them together.
	//While working on such code, you might want to check out what's happening at various parts in the pipeline.
	//To do that, insert a call to inspect().
	//It's more common for inspect() to be used as a debugging tool than to exist in your final code,
	//but applications may find it useful in certain situations when errors need to be logged before being discarded.
	Inspect = (func: (_: TableType) => void) =>
		new Iterator2(() => {
			let obj = this.value()
			if (obj.kind == "none") {
				return none()
			}
			func(obj.value)
			return obj
		}, this.name, this.convertToRequestedType)

	forEach = (func: (_: OutcomeType) => void) => {
		while (true) {
			const next = this.next()
			if (next.kind == "some") {
				func(next.value)
			} else {
				break
			}
		}
	}

	find = (func: (_: OutcomeType) => boolean) => {
		while (true) {
			const obj = this.next()
			if (obj.kind == "none") {
				return none()
			}
			if (func(obj.value)) {
				return obj
			}
		}
	}

	next(): Option<OutcomeType> {
		const next = this.value()
		if (next.kind == "none") {
			return none()
		}
		return some(this.convertToRequestedType(next.value))

	}

	toList = (): Array<OutcomeType> => {
		let list: OutcomeType[] = []
		while (true) {
			const v = this.next()

			if (v.kind == "some") {
				list.push(v.value)
			} else {
				return list
			}
		}
	}
}