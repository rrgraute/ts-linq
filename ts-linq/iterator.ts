import { data_container, JoinTable, data, joins, Option, some, none } from "./data"



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

	constructor(val: () => Option<TableType>, name: TableKey, display: (v: TableType) => OutcomeType) {
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
		return new Iterator2(this.value, this.name, (v) => fun(this.convertToRequestedType(v)))
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
			this.convertToRequestedType
		)
	}

	Include<X extends keyof JoinTable[TableKey] & keyof data_container & keyof JoinTable, Y>(
		table_to_join: X,
		fun: (v: Iterator2<X, data_container[X], data_container[X]>) => Iterator2<X, data_container[X], Y>
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