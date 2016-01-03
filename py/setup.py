from setuptools import setup
from os.path import join, dirname
from kson import __version__


def read(fname):
    return open(join(dirname(__file__), fname)).read()


setup(
    name='kson',
    version=__version__,
    description='Keystripped Schemafied Object Notation',
    long_description=read('../README.md'),
    author='Manuel Barkhau',
    author_email='mbarkhau@gmail.com',
    url='http://bitbucket.org/mbarkhau/kson/',
    license="BSD License",
    packages=['kson'],
    install_requires=['docopt'],
    entry_points={'console_scripts': ['kson = kson.command:main']},
    keywords="kson json parser javascript schema",
    classifiers=[
        'Development Status :: 4 - Beta',
        'Environment :: Console',
        'Environment :: Web Environment',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: MacOS :: MacOS X',
        'Operating System :: POSIX',
        "Programming Language :: Python",
        "Programming Language :: Python :: 2",
        "Programming Language :: Python :: 3",
        'Topic :: Utilities',
    ],

)
