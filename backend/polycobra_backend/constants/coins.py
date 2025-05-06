from enum import Enum


class Coin(Enum):
    ETH = 'ETH'
    BTC = 'BTC'
    SOL = 'SOL'
    XRP = 'XRP'

    def __init__(self, label):
        self.label = label

    @classmethod
    def from_label(cls, label: str):
        for role in cls:
            if role.label == label:
                return role

        raise ValueError(f"No Coin with label '{label}' found.")

    def __str__(self):
        return self.label
