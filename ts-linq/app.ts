type course = { name: string, id: number }
type student = { id: number, name: string }
type courseStudent = { student_id: number, course_id: number }

type data_container = { "courses": course, "students": student, "courseStudent": courseStudent }

type test<T extends keyof data_container & string, E extends data_container[T]> = Map<T, E>;


const data = {
	"courses": [{ name: "awesome", id: 2 }, { name: "test2", id: 3 }, { name: "awesome2", id: 1 }],
	"students": [{ name: "ryan", id: 1 }, { name: "casper", id: 2 }, { name: "Tim", id: 3 }],
	"courseStudent": [{ student_id: 2, course_id: 2 }, { student_id: 3, course_id: 1 }, { student_id: 1, course_id: 3 }, { student_id: 3, course_id: 2 }]
}


type joined<Left extends keyof data_container, Right extends keyof data_container> = {
	left: keyof data_container[Left],
	right: keyof data_container[Right]
}

const test: joined<"courseStudent", "students"> = {
	left: "student_id",
	right: "id"
}

type Joins = {
	[v in keyof Partial<data_container>]: {
		[x in keyof Partial<data_container>]: joined<x, v>
	}
}

type TestJoin = {
	"students": {
		"courseStudent": { left: "student_id", right: "id" }
	},
	"courseStudent": { "students": { left: "id", right: "student_id" } }
	"courses": {
		"courseStudent": { left: "course_id", right: "id" }
	}
}

const joins: TestJoin & Joins = {
	"students": {
		"courseStudent": { left: "student_id", right: "id" }
	},
	"courseStudent": {
		"students": { left: "id", right: "student_id" }
	},
	"courses": {
		"courseStudent": { left: "course_id", right: "id" }
	}
}



class ListModel<T extends keyof data_container & keyof TestJoin, E extends data_container[T]> {
	reference: Array<E>
	at: number;
	name: T
	constructor(name: T) {
		this.reference = data[name] as unknown as [E]
		this.at = 0;
		this.name = name;
	}
	next = () => {
		let val = this.reference[this.at];
		this.at += 1;
		return val;
	};
	iterModel = () => new Iterator2(this.next, this.name, (v) => v)
}


class Iterator2<T extends keyof data_container & keyof TestJoin, E extends data_container[T], V = data_container[T]> {
	private value: () => E | null;
	private name: T;
	private last_filter: (v: E | null) => V;

	constructor(val: () => E | null, name: T, display: (v: E | null) => V) {
		this.value = val;
		this.name = name;
		this.last_filter = display;
	}

	Select<C2 extends keyof E>(...c: C2[]): Iterator2<T, E, { [x in typeof c[number]]: Array<C2>[number] }> {
		return new Iterator2(this.value, this.name, v => {
			let x: Partial<{ [x in typeof c[number]]: Array<C2>[number] }> = {};
			c.forEach(z => x = { ...x, [z]: v[z] });
			return x as { [x in typeof c[number]]: Array<C2>[number] }
		})
	}

	Map<X>(fun: (v: V) => X): Iterator2<T, E, X> {
		return new Iterator2(this.value, this.name, (v) => fun(this.last_filter(v)))
	}

	Where(func: (_: E) => boolean) {
		return new Iterator2(() => {
			while (true) {
				const val = this.value();
				if (val == undefined || func(val)) {
					return val;
				}
			}
		}, this.name, this.last_filter)
	}

	Include<X extends keyof TestJoin[T] & keyof data_container & keyof TestJoin, Y>(
		table_to_join: X,
		fun: (v: Iterator2<X, data_container[X], data_container[X]>) => Iterator2<X, data_container[X], Y>
	): Iterator2<T, E, { [_ in X]: Y[] } & V> {
		const next = () => {
			const next = this.value();
			if (!next) {
				return undefined
			}
			const z = {
				[table_to_join]: fun(new ListModel(table_to_join).iterModel().Where(p => {
					const keys = joins[this.name][table_to_join];
					if (next && p) {
						return next[keys["right"]] == p[keys["left"]]
					}

				})).toList(),
				...next
			}
			return z
		}
		return new Iterator2(next, this.name, (current) => {
			let basic = this.last_filter(current);
			let final = { [table_to_join]: current[table_to_join], ...basic };
			let final2 = final as V & { [_ in X] }
			return final2;
		})
	}

	Inspect = (func: (_: E) => void) =>
		new Iterator2(() => {
			let obj = this.value();
			if (obj == undefined) {
				return undefined;
			} else {
				func(obj);
				return obj;
			}
		}, this.name, this.last_filter);

	forEach = (func: (_: V) => void) => {
		while (true) {
			const next = this.next();
			if (next) {
				func(next);
			} else {
				break;
			}
		}
	};

	find = (func: (_: V) => boolean) => {
		while (true) {
			const obj = this.next();
			if (obj == undefined) {
				return undefined;
			}
			if (func(obj)) {
				return obj;
			}
		}
	};

	next(): V | null {
		const next = this.value();
		if (next == undefined || next == null) {
			return undefined
		}
		return this.last_filter(next)

	}

	toList = (): Array<V> => {
		let list: V[] = [];
		while (true) {
			const v = this.next()
			//console.log(v)
			if (v) {
				list.push(v)
			} else {
				return list
			}
		}
	}
}

console.log(new ListModel("courses")
	.iterModel()
	.Select("name", "name")
	.Include(
		"courseStudent",
		(v) => v.Include("students", (v) => v)//.Select("course")
	)
	.Map(v => ({ ...v, name: v.name + " awesome" }))
	.find(v => v.courseStudent.some(x => x.student_id = 1)))
	/*.forEach(
v => {
console.log("coursename", v.name)
console.log(v.courseStudent)
v.courseStudent.forEach(v => console.log(v))
}
)*/