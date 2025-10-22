---
created_at: '2024-12-15T06:14:46.000Z'
feature_image: https://images.unsplash.com/photo-1703196565814-b066044e23a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDM1fHxtZXRhfGVufDB8fHx8MTczNTgyNzYwN3ww&ixlib=rb-4.0.3&q=80&w=2000
published_date: '2025-01-04T14:30:24.000Z'
slug: python-metaclass
status: published
title: 메타클래스에 관해
modified_date: '2025-01-04T14:30:24.000Z'
---
메타클래스(metaclass)는 '**클래스를 만드는 클래스**'입니다. 이 정의는 정확하지만, 메타클래스를 처음 접하는 개발자에게는 여전히 추상적으로 느껴집니다. 메타클래스가 어려운 이유는 일상적인 프로그래밍에서 거의 사용되지 않으며, 파이썬의 객체 시스템에 대한 깊은 이해를 요구하기 때문입니다.

하지만 메타클래스를 이해하면 파이썬의 클래스 시스템이 어떻게 작동하는지 근본적으로 이해할 수 있습니다. 이 글에서는 메타클래스의 개념부터 실제 활용까지 단계적으로 살펴보겠습니다.

## 파이썬에서는 클래스도 객체입니다.

먼저 중요한 사실 하나를 짚고 넘어가야 합니다. **파이썬에서 클래스는 그 자체로 객체입니다.**

일반적으로 클래스는 객체를 만드는 '붕어빵 틀'이나 '설계도'에 비유됩니다. 하지만 파이썬을 비롯한 많은 객체지향 언어에서 클래스는 단순한 템플릿이 아니라 그 자체가 실체를 가진 객체입니다.

```python
class MyClass:
    pass

# 클래스도 객체이므로 다음이 모두 가능합니다
my_var = MyClass  # 변수에 할당
MyClass.new_attr = "Hello"  # 속성 추가

def take_class(cls):
    return cls()

instance = take_class(MyClass)  # 함수의 인자로 전달
```

클래스가 객체라는 사실은 메타클래스를 이해하는 핵심입니다. 모든 객체는 클래스로부터 만들어지는데, 그렇다면 클래스 객체는 어디서 만들어질까요? 바로 메타클래스에서 만들어집니다.

## type의 이중성: 타입 확인과 클래스 생성

`type()`은 파이썬 입문자도 잘 아는 내장 함수입니다. 객체의 타입을 확인할 때 사용하죠.

```python
a = 5
print(type(a))  # <class 'int'>

b = "hello"
print(type(b))  # <class 'str'>
```

그런데 `type()`에는 잘 알려지지 않은 또 다른 용법이 있습니다. **동적으로 새로운 클래스를 생성하는 것**입니다.

```python
# class 구문으로 클래스 정의
class MyClass:
    pass

# type()으로 동일한 클래스 생성
MyClass = type("MyClass", (), {})

a = MyClass()
print(a)  # <__main__.MyClass object at 0x...>
```

이 두 방법은 완전히 동일한 결과를 만듭니다. 한 가지 유일한 차이는 다음과 같습니다. 

- `class` 구문: 소스코드에 정적으로 타입 정의
- `type()` 함수: 실행 시간에 동적으로 타입 생성

### type()으로 클래스 만들기

`type()`으로 클래스를 생성할 때는 세 개의 인자를 전달합니다:

```python
NewClass = type(class_name, bases, attrs)
```

1. **class_name** (str): 생성할 클래스의 이름
2. **bases** (tuple): 상속받을 부모 클래스들의 튜플
3. **attrs** (dict): 클래스가 가질 속성과 메서드를 담은 딕셔너리

예제를 보겠습니다:

```python
# 속성과 메서드를 가진 클래스 생성
def say_hello(self):
    return f"Hello, I'm {self.name}"

Person = type(
    "Person",
    (),  # 상속받을 클래스 없음
    {
        "name": "Anonymous",
        "say_hello": say_hello
    }
)

p = Person()
print(p.say_hello())  # Hello, I'm Anonymous
```

이는 다음 코드와 완전히 동일합니다:

```python
class Person:
    name = "Anonymous"
    
    def say_hello(self):
        return f"Hello, I'm {self.name}"
```

## 메타클래스의 정체: type

모든 클래스는 객체입니다. 그리고 모든 객체에는 그것을 만든 클래스가 있습니다. 클래스를 만든 클래스는 무엇일까요?

```python
class MyClass:
    pass

# 인스턴스의 클래스 확인
instance = MyClass()
print(instance.__class__)  # <class '__main__.MyClass'>

# 클래스의 클래스 확인
print(MyClass.__class__)  # <class 'type'>
```

**파이썬에서 모든 클래스는 `type`에 의해 만들어집니다.** `type`이 바로 파이썬의 기본 메타클래스입니다.

`class` 구문을 사용할 때, 내부적으로는 `type()`이 호출되어 새로운 클래스 객체가 생성됩니다. 다시 말해 아래와 같은 코드를 작성했다면,

```python
class MyClass:
    x = 10
```

이 코드는 내부적으로 다음과 같이 처리됩니다:

```python
MyClass = type("MyClass", (), {"x": 10})
```

## 커스텀 메타클래스 만들기

기본 메타클래스인 `type`을 상속받아 커스텀 메타클래스를 만들 수 있습니다. 이를 통해 클래스 생성 과정을 제어할 수 있습니다.

### 메타클래스 사용 문법

클래스를 정의할 때 `metaclass` 키워드 인자로 메타클래스를 지정합니다:

```python
class MyClass(metaclass=CustomMetaClass):
    pass
```

이렇게 하면 `type` 대신 `CustomMetaClass`가 `MyClass`를 생성합니다.

### 메타클래스의 핵심 메서드: **new**

메타클래스를 만들 때 가장 중요한 메서드는 `__new__()`입니다. 이 메서드는 새로운 클래스 객체를 생성할 때 호출됩니다.

```python
class Meta(type):
    def __new__(mcs, name, bases, attrs):
        # name: 생성될 클래스의 이름
        # bases: 부모 클래스들의 튜플
        # attrs: 클래스 속성들의 딕셔너리
        
        print(f"Creating class: {name}")
        return super().__new__(mcs, name, bases, attrs)

class MyClass(metaclass=Meta):
    x = 10

# 출력: Creating class: MyClass
```

### `__new__`와 `__init__`의 차이

- **`__new__`**: 객체를 실제로 생성하는 메서드. 새 객체를 반환해야 함
- **`__init__`**: 생성된 객체를 초기화하는 메서드. None을 반환

메타클래스에서는 주로 `__new__`를 사용하지만, `__init__`도 사용할 수 있습니다:

```python
class Meta(type):
    def __new__(mcs, name, bases, attrs):
        # 클래스 생성
        cls = super().__new__(mcs, name, bases, attrs)
        return cls
    
    def __init__(cls, name, bases, attrs):
        # 생성된 클래스 초기화
        super().__init__(name, bases, attrs)
        print(f"Initialized class: {name}")
```

## 실전 예제

메타클래스의 가장 대표적인 활용 사례는 싱글톤 패턴입니다. 싱글톤은 클래스의 인스턴스가 프로그램 전체에서 단 하나만 존재하도록 보장하는 디자인 패턴입니다.

### 싱글톤 메타클래스 구현

```python
class Singleton(type):
    _instances = {}
    
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class Database(metaclass=Singleton):
    def __init__(self):
        print("Database 초기화")

# 테스트
db1 = Database()  # 출력: Database 초기화
db2 = Database()  # 출력 없음 (이미 생성됨)

print(db1 is db2)  # True
```

### 작동 원리

1. `_instances`: 클래스별 싱글톤 인스턴스를 저장하는 딕셔너리
2. `__call__`: 클래스를 호출할 때 (즉, 인스턴스를 생성할 때) 실행되는 메서드
3. 인스턴스가 이미 존재하면 기존 인스턴스를 반환하고, 없으면 새로 생성

여기서 `__call__`을 사용한 이유는 무엇일까요?

- 메타클래스의 `__new__`는 클래스 생성 시 호출됩니다
- 메타클래스의 `__call__`은 그 클래스의 인스턴스 생성 시 호출됩니다

싱글톤은 클래스 생성이 아니라 인스턴스 생성을 제어해야 하므로 `__call__`을 사용합니다.

### 싱글톤의 상속

메타클래스로 구현한 싱글톤은 자동으로 상속됩니다:

```python
class Database(metaclass=Singleton):
    pass

class MySQLDatabase(Database):
    pass

db1 = MySQLDatabase()
db2 = MySQLDatabase()

print(db1 is db2)  # True
```

## 예제 - 자동 속성 검증하기기

메타클래스를 사용하면 클래스의 모든 속성을 검증하거나 변환할 수 있습니다.

```python
class ValidatedMeta(type):
    def __new__(mcs, name, bases, attrs):
        # 모든 메서드가 docstring을 가지고 있는지 검증
        for key, value in attrs.items():
            if callable(value) and not key.startswith('_'):
                if not value.__doc__:
                    raise ValueError(
                        f"메서드 '{key}'에 docstring이 없습니다."
                    )
        
        return super().__new__(mcs, name, bases, attrs)

class MyClass(metaclass=ValidatedMeta):
    def good_method(self):
        """이 메서드는 docstring이 있습니다."""
        pass
    
    def bad_method(self):  # ValueError 발생!
        pass
```

## 실전 예제 3: 자동 등록 시스템

메타클래스를 사용하면 클래스가 생성될 때 자동으로 레지스트리에 등록할 수 있습니다.

```python
class PluginRegistry(type):
    plugins = {}
    
    def __new__(mcs, name, bases, attrs):
        cls = super().__new__(mcs, name, bases, attrs)
        
        # 베이스 클래스가 아닌 경우에만 등록
        if bases:
            mcs.plugins[name] = cls
        
        return cls

class Plugin(metaclass=PluginRegistry):
    """모든 플러그인의 베이스 클래스"""
    pass

class AudioPlugin(Plugin):
    pass

class VideoPlugin(Plugin):
    pass

# 자동으로 등록된 플러그인 확인
print(PluginRegistry.plugins)
# {'AudioPlugin': <class '__main__.AudioPlugin'>, 
#  'VideoPlugin': <class '__main__.VideoPlugin'>}
```

## 함수 기반 메타클래스

메타클래스는 반드시 클래스일 필요는 없습니다. 클래스를 반환하는 함수도 메타클래스로 사용할 수 있습니다.

```python
def uppercase_attrs(name, bases, attrs):
    """모든 속성명을 대문자로 변환하는 메타클래스 함수"""
    uppercase_attrs = {}
    
    for attr_name, attr_value in attrs.items():
        if attr_name.startswith('__'):
            uppercase_attrs[attr_name] = attr_value
        else:
            uppercase_attrs[attr_name.upper()] = attr_value
    
    return type(name, bases, uppercase_attrs)

class Foo(metaclass=uppercase_attrs):
    bar = "bip"

f = Foo()
print(f.BAR)  # bip
print(hasattr(f, 'bar'))  # False
```

## 결론

메타클래스는 파이썬의 강력한 기능이지만, 일상적인 개발에서는 거의 필요하지 않습니다. DSL 이나 프레임워크를 설계하고 만드는 일이 아니라면 99.99%의 파이썬 개발자는 메타클래스를 사용할 일이 없습니다. 메타클래스가 필요한지 확실하지 않다면, 아마도 필요하지 않을 것입니다. 하지만 그 원리를 이해하는 것은 여러 프레임워크에서 마법과 같은 기능들을 이해하는 밑거름이 될 수 있을 겁니다.